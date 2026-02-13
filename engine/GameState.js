class GameState {
  constructor(config) {
    this.config = config;
    this.score = 0;
    this.visitedHotspots = new Set();
    this.eventsTriggered = new Set(); // <-- NOVO: cenas cujo evento já ocorreu
    this.currentSceneId = null;
    this.totalHotspotsInScene = 0;
  }

  reset() {
    this.score = 0;
    this.visitedHotspots.clear();
    this.eventsTriggered.clear(); // <-- NOVO - Reset completo
  }

  enterScene(sceneId, totalHotspots) {
    this.currentSceneId = sceneId;
    this.totalHotspotsInScene = totalHotspots;
    // Filtra hotspots visitados apenas desta cena se quiser lógica por cena
    // Aqui vamos manter um global simples ou por cena
    window.dispatchEvent(
      new CustomEvent("updatetracker", {
        detail: { score: this.score, progress: this.getSceneProgress() },
      }),
    );
  }

  registerVisit(hotspotId) {
    if (!this.visitedHotspots.has(hotspotId)) {
      this.visitedHotspots.add(hotspotId);
      this.addScore(this.config.gameplay.points_per_hotspot);

      window.dispatchEvent(
        new CustomEvent("updatetracker", {
          detail: { score: this.score, progress: this.getSceneProgress() },
        }),
      );

      return true; // Primeira visita
    }
    return false;
  }

  addScore(points) {
    this.score += points;
  }

  getSceneProgress() {
    // Conta quantos hotspots da cena atual já foram visitados
    // Simplificação: assume que visitedHotspots guarda IDs únicos globais
    // Para calcular %, precisamos saber quantos hotspots TEM na cena atual.
    // O totalHotspotsInScene deve ser passado ao entrar na cena.
    if (this.totalHotspotsInScene === 0) return 100;

    // Filtra os visitados que pertencem a cena atual (precisa de prefixo ou lógica,
    // mas aqui vamos simplificar assumindo que o contador é gerenciado externamente ou incrementado)
    // Solução Robusta: UIController verifica quais hotspots da cena ativa estão no Set.
    return 0; // Será calculado pelo UIController com base nos dados visuais
  }

  canUnlockQuiz(hotspotsList) {
    if (!this.config.gameplay.require_exploration_to_quiz) return true;

    // Verifica se todos os hotspots (exceto o próprio quiz) foram visitados
    const required = hotspotsList.filter((h) => h.action !== "quiz");
    const visitedCount = required.filter((h) =>
      this.visitedHotspots.has(h.id),
    ).length;

    return visitedCount === required.length;
  }

  getProgressPercent(hotspotsList) {
    const required = hotspotsList.filter((h) => h.action !== "quiz");
    if (required.length === 0) return 100;
    const visitedCount = required.filter((h) =>
      this.visitedHotspots.has(h.id),
    ).length;
    return Math.floor((visitedCount / required.length) * 100);
  }

  // Método para resetar UMA cena específica
  resetScene(sceneId) {
    // Remove apenas os hotspots visitados DESTA cena
    const scene = this.config.scenes.find(s => s.id === sceneId);
    if (scene) {
      scene.hotspots.forEach(h => {
        this.visitedHotspots.delete(h.id);
      });
    }
    // Remove o evento disparado desta cena
    this.eventsTriggered.delete(sceneId);
  }

  isSceneFullyExplored(sceneId) {
    const scene = this.config.scenes.find(s => s.id === sceneId);
    if (!scene) return false;
    
    // Pega APENAS os hotspots de diálogo (ignora o quiz)
    const dialogHotspots = scene.hotspots.filter(h => h.action === "dialog");
    
    // Se não tem nenhum hotspot de diálogo, já está explorado
    if (dialogHotspots.length === 0) return true;
    
    // Conta quantos já foram visitados
    const visitedCount = dialogHotspots.filter(h => 
      this.visitedHotspots.has(h.id)
    ).length;
    // Retorna TRUE se TODOS foram visitados
    return visitedCount === dialogHotspots.length;
  }

  // Método para contar quantos diálogos faltam
  getRemainingExploration(sceneId) {
    const scene = this.config.scenes.find(s => s.id === sceneId);
    if (!scene) return 0;
    
    const dialogHotspots = scene.hotspots.filter(h => h.action === "dialog");
    const visitedCount = dialogHotspots.filter(h => 
      this.visitedHotspots.has(h.id)
    ).length;
    
    return dialogHotspots.length - visitedCount;
  }
}
