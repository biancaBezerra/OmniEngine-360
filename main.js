class GameEngine {
  constructor() {
    this.config = null;
    this.themeParams = new ThemeController();
    this.audio = new AudioController();
    this.ui = new UIController(this);
    this.state = null;
    this.view360 = null;
    this.hotspots = null;
    this.events = null;
    this.stats = null;
  }

  async init() {
    const response = await fetch("config/game-config.json");
    this.config = await response.json();

    this.themeParams.applyTheme(this.config.theme);
    this.state = new GameState(this.config);
    this.view360 = new ThreeSixtyView("three-canvas");

    // PASSA A IMAGEM DO GLITCH PARA O ThreeSixtyView
    if (this.config.theme.assets.glitch_effect) {
      this.view360.setGlitchImage(this.config.theme.assets.glitch_effect);
    }

    this.hotspots = new HotspotController("hotspots-layer", this.view360);
    this.events = new EventController(this);

    // --- LÓGICA DE ÁUDIO INICIAL ---

    // 1. Tenta tocar o áudio do menu imediatamente
    if (this.config.meta.menu_bgm) {
      this.audio.playBGM(this.config.meta.menu_bgm);
    }

    // 2. Hack para navegadores que bloqueiam autoplay
    const unlockAudio = () => {
      this.audio.unlock();
      if (this.config.meta.menu_bgm && this.audio.bgm.paused) {
        this.audio.playBGM(this.config.meta.menu_bgm);
      }
      document.removeEventListener("click", unlockAudio);
    };
    document.addEventListener("click", unlockAudio);

    // 3. Inicializa a UI
    this.ui.init(
      this.config,
      () => this.startGame(), // Botão Iniciar
      () => this.goHome(), // Botão Home
    );
  }

  startGame() {
    // === RESET NO INÍCIO ===
    // Garante que, se clicar em "Iniciar Sistema" de novo (F5 ou recarregar), zera tudo.
    this.state.reset();
    this.updateUI();

    // Toca som de efeito (SFX)
    if (this.config.meta.start_sound)
      this.audio.playSFX(this.config.meta.start_sound);

    this.ui.showScreen("game-ui");
    this.ui.showNarrator(this.config.narrator.intro_text);

    const hub = this.config.scenes.find((s) => s.type === "menu");
    if (hub) this.loadMenuScene(hub);
  }

  goHome() {
    const hub = this.config.scenes.find((s) => s.type === "menu");
    if (hub) {
      this.loadMenuScene(hub);
      document.getElementById("scene-container").style.display = "none";
      document.getElementById("narrator-area").style.display = "none";

      if (this.config.meta.menu_bgm) {
        this.audio.playBGM(this.config.meta.menu_bgm);
      }

      this.cleanupSceneEffects();

      // === RESET AO VOLTAR PRO MENU ===
      // Zera a pontuação e força a atualização visual imediata
      this.state.reset();
      this.updateUI();
    }
  }

  loadMenuScene(sceneData) {
    this.ui.renderLevelSelect(sceneData.cards, sceneData.background, (card) => {
      this.load360Scene(card.targetScene);
    });
  }

  resetAndPlayScene(sceneId) {
    this.state.resetScene(sceneId);
    this.load360Scene(sceneId);
  }

  load360Scene(sceneId) {
    const scene = this.config.scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    // Lógica de Áudio
    if (scene.audio_ambience) {
      this.audio.playBGM(scene.audio_ambience);
    } else {
      this.audio.stopBGM();
    }

    this.state.enterScene(sceneId, scene.hotspots.length);
    this.ui.showScreen("game-ui");
    document.getElementById("scene-container").style.display = "block";

    this.view360.loadScene(scene.image);

    if (scene.initial_view) {
      this.view360.setInitialView(scene.initial_view);
    } else {
      this.view360.setInitialView(0, 0);
    }

    if (scene.audio_ambience) this.audio.playBGM(scene.audio_ambience);
    if (scene.narrator_intro) this.ui.showNarrator(scene.narrator_intro);

    this.hotspots.loadHotspots(scene, (hotspot) =>
      this.handleHotspotClick(hotspot, scene),
    );

    this.updateUI();
  }

  handleHotspotClick(hotspot, sceneData) {
    if (hotspot.action === "dialog") {
      const isFirstVisit = this.state.registerVisit(hotspot.id);
      this.updateUI();

      const isFullyExplored = this.state.isSceneFullyExplored(sceneData.id);
      const eventNotTriggered = !this.state.eventsTriggered.has(sceneData.id);

      this.ui.showNarrator(
        hotspot.content,
        () => {
          if (isFullyExplored && eventNotTriggered && isFirstVisit) {
            this.ui.showNarrator(
              "🎯 Protocolo de Verificação desbloqueado! Clique no ícone para iniciar.",
              null,
              "byte",
            );
          }
        },
        "byte",
      );
      return;
    }

    if (hotspot.action === "quiz") {
      const isFullyExplored = this.state.isSceneFullyExplored(sceneData.id);

      if (!isFullyExplored) {
        this.ui.showNarrator(
          hotspot.locked_message ||
            "Acesso negado. Complete a exploração primeiro.",
          null,
          "byte",
        );
        return;
      }

      if (!this.state.eventsTriggered.has(sceneData.id)) {
        this.events.triggerVillainSequence(sceneData, hotspot);
      } else {
        this.openQuiz(hotspot, sceneData);
      }
    }
  }

  openQuiz(hotspot, sceneData) {
    console.log("📝 Abrindo quiz");

    if (!hotspot || !hotspot.questions) {
      console.error("❌ Quiz hotspot inválido!", hotspot);
      return;
    }

    this.ui.showQuiz(hotspot, (success) => {
      if (success) {
        this.state.addScore(this.config.gameplay.points_quiz_correct);

        if (sceneData.event?.victory_sound) {
          this.audio.playSFX(sceneData.event.victory_sound);
        }

        if (this.events) {
          this.events.villainDefeated(sceneData);
        } else {
          this.ui.showNarrator(
            sceneData.event?.villain_defeat || "Nããão! Derrotado!",
            () => {
              this.ui.showNarrator(
                sceneData.event?.victory_message || "Sistema restaurado!",
                () => this.goHome(),
                "byte",
              );
            },
            "villain",
          );
        }
      }
      this.updateUI();
    });
  }

  cleanupSceneEffects() {
    this.view360?.stopRedAlert();
    this.view360?.hideStaticEffect();
    // this.view360?.hideSmokeEffect();  <--- ESTA LINHA FOI REMOVIDA POIS CAUSAVA O ERRO

    const villain = document.getElementById("villain-container");
    if (villain) villain.style.display = "none";
  }

  updateUI() {
    // Calcula o progresso baseado na cena atual (ou 0 se não tiver cena)
    const scene = this.config.scenes.find(
      (s) => s.id === this.state.currentSceneId,
    );
    const percent = scene ? this.state.getProgressPercent(scene.hotspots) : 0;

    // Atualiza o visual
    this.ui.updateTracker(this.state.score, percent, this.state.currentSceneId);
  }
}

window.onload = () => {
  const game = new GameEngine();
  game.init();
};
