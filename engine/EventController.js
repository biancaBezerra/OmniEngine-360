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
            this.game.goHome();
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
    if (villainContainer) {
      villainContainer.style.display = "block";
      void villainContainer.offsetWidth;
      villainContainer.classList.add("visible");
      this.startVillainAnimation();
    }
  }

  hideVillainSprite() {
    const villainContainer = document.getElementById("villain-container");
    this.stopVillainAnimation();

    if (villainContainer) {
      villainContainer.classList.remove("visible");
      setTimeout(() => {
        villainContainer.style.display = "none";
      }, 1400);
    }
  }

  // --- ANIMAÇÃO LINEAR (SEQUENCIAL) ---
  startVillainAnimation() {
    const spriteEl = document.getElementById("villain-sprite");
    if (!spriteEl) return;

    if (this.villainInterval) clearInterval(this.villainInterval);

    let currentFrame = 0; // Começa do quadro 0

    this.villainInterval = setInterval(() => {
      // 1. Calcula Coluna e Linha sequencialmente
      // Como a imagem tem 6 colunas, usamos o resto da divisão (%)
      const col = currentFrame % 6;

      // Como tem 3 linhas, dividimos por 6 e arredondamos para baixo
      const row = Math.floor(currentFrame / 6);

      // 2. Converte para porcentagem CSS
      const x = col * 20.09;
      const y = row * 50.6;

      spriteEl.style.backgroundPosition = `${x}% ${y}%`;

      // 3. Avança para o próximo quadro
      currentFrame++;

      // 4. Se chegou no final (18 quadros: 0 a 17), volta pro zero
      if (currentFrame >= 18) {
        currentFrame = 0;
      }
    }, 80); // 80ms = Aproximadamente 12 FPS (movimento suave)
  }

  stopVillainAnimation() {
    if (this.villainInterval) clearInterval(this.villainInterval);
    // Opcional: Resetar para o primeiro quadro ao parar
    const spriteEl = document.getElementById("villain-sprite");
    if (spriteEl) {
      spriteEl.style.backgroundPosition = "0% 0%";
    }
  }
}
