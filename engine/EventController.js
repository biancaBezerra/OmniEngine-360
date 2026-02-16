class EventController {
  constructor(gameEngine) {
    this.game = gameEngine;
    this.isEventActive = false;
    this.villainInterval = null;
  }

  checkAndTriggerEvent() {
    const scene = this.game.config.scenes.find(
      (s) => s.id === this.game.state.currentSceneId,
    );

    if (!scene || !scene.event) return false;

    const requiredHotspots = scene.hotspots.filter((h) => h.action !== "quiz");
    const visitedCount = requiredHotspots.filter((h) =>
      this.game.state.visitedHotspots.has(h.id),
    ).length;

    const allVisited = visitedCount === requiredHotspots.length;
    const eventNotTriggered = !this.game.state.eventsTriggered.has(scene.id);

    if (allVisited && eventNotTriggered) {
      this.triggerEvent(scene);
      return true;
    }

    return false;
  }

  triggerEvent(scene) {
    this.isEventActive = true;
    this.game.state.eventsTriggered.add(scene.id);
    if (scene.event.type === "villain_appears") {
      this.triggerVillainSequence(scene);
    }
  }

  triggerVillainSequence(scene, quizHotspot) {
    console.log("🎮 Evento do vilão iniciado em:", scene.id);
    this.game.state.eventsTriggered.add(scene.id);
    this.isEventActive = true;

    // 1. ALARME
    if (scene.event.alarm_sound) {
      this.game.audio.playSFX(scene.event.alarm_sound);
    }
    this.game.view360.startRedAlert();

    setTimeout(() => {
      // 2. EFEITO GLITCH
      this.game.view360.showGlitchEffect();

      setTimeout(() => {
        // 3. VILÃO APARECE
        this.showVillainSprite();

        setTimeout(() => {
          // 4. VILÃO FALA
          this.game.ui.showNarrator(
            scene.event.villain_speech,
            () => {
              // 5. B.Y.T.E. ALERTA
              this.game.ui.showNarrator(
                scene.event.byte_alert,
                () => {
                  // 6. FIM DA SEQUÊNCIA
                  this.game.view360.stopRedAlert();
                  this.game.view360.hideGlitchEffect();
                  this.hideVillainSprite();

                  if (quizHotspot) {
                    this.game.openQuiz(quizHotspot, scene);
                  }
                },
                "byte",
              );
            },
            "villain",
          );
        }, 800);
      }, 1500);
    }, 2000);
  }

  villainDefeated(scene) {
    this.isEventActive = false;
    if (scene.event.victory_sound) {
      this.game.audio.playSFX(scene.event.victory_sound);
    }

    this.showVillainSprite();
    this.game.view360.startVictoryGlow();

    this.game.ui.showNarrator(
      scene.event.villain_defeat,
      () => {
        this.game.view360.stopVictoryGlow();
        this.hideVillainSprite();

        this.game.ui.showNarrator(
          scene.event.victory_message,
          () => {
            // ALTERAÇÃO AQUI: voltar para seleção de níveis, não tela inicial
            const hub = this.game.config.scenes.find((s) => s.type === "menu");
            if (hub) {
              this.game.loadMenuScene(hub);

              // Toca a música do menu
              if (this.game.config.meta.menu_bgm) {
                this.game.audio.playBGM(this.game.config.meta.menu_bgm);
              }

              // Mostra o diálogo do B.Y.T.E. novamente
              setTimeout(() => {
                this.game.ui.showNarrator(
                  this.game.config.narrator.after_accept_text,
                  null,
                  "byte",
                );
              }, 500);
            }
          },
          "byte",
        );
      },
      "villain",
    );
  }

  // ===== CONTROLE DO SPRITE GIGANTE =====

  showVillainSprite() {
    const villainContainer = document.getElementById("villain-container");
    const villainSprite = document.getElementById("villain-sprite");

    if (villainContainer && villainSprite) {
      villainContainer.style.display = "block";
      void villainContainer.offsetWidth; // Força reflow p/ transição CSS
      villainContainer.classList.add("visible");

      // CRIA O ANIMATOR APENAS UMA VEZ OU RECICLA
      if (!this.villainAnimator) {
        // Usa a config do JSON
        this.villainAnimator = new SpriteAnimator(
          villainSprite,
          this.game.config.theme.assets.villain_sprite_config,
        );
      }
      this.villainAnimator.play();
    }
  }

  hideVillainSprite() {
    const villainContainer = document.getElementById("villain-container");

    // Para a animação usando a classe nova
    if (this.villainAnimator) {
      this.villainAnimator.stop();
    }

    if (villainContainer) {
      villainContainer.classList.remove("visible");
      setTimeout(() => {
        villainContainer.style.display = "none";
      }, 1400);
    }
  }

  // Estes métodos antigos podem ser removidos ou deixados vazios para não quebrar chamadas antigas
  startVillainAnimation() {
    if (this.villainAnimator) this.villainAnimator.play();
  }

  stopVillainAnimation() {
    if (this.villainAnimator) this.villainAnimator.stop();
  }

  resetEvents() {
    console.log("🔄 Resetando EventController...");

    // Para o intervalo do vilão
    if (this.villainInterval) {
      clearInterval(this.villainInterval);
      this.villainInterval = null;
    }

    // Reseta flags
    this.isEventActive = false;

    // Esconde o sprite do vilão
    this.hideVillainSprite();

    // Limpa qualquer timeout pendente
    const highestTimeoutId = setTimeout(() => {});
    for (let i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
    }
  }
}
