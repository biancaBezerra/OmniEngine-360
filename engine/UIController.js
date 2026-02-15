class UIController {
  constructor(gameEngine) {
    this.game = gameEngine;
    this.els = {
      title: document.getElementById("game-title"),
      narratorArea: document.getElementById("narrator-area"),
      narratorText: document.getElementById("narrator-text"),
      narratorSprite: document.getElementById("narrator-sprite"),
      narratorName: document.getElementById("narrator-name"),
      levelSelect: document.getElementById("level-select"),
      cardsContainer: document.getElementById("cards-container"),
      score: document.getElementById("score-display"),
      progress: document.getElementById("exploration-display"),
      quizOverlay: document.getElementById("quiz-overlay"),
      startScreen: document.getElementById("start-screen"),
      // NOVOS BOTÕES
      btnNext: document.getElementById("btn-next-dialog"),
      btnHome: document.getElementById("btn-home"),
      btnAudio: document.getElementById("btn-audio"),
      volumeSlider: document.getElementById("volume-slider"),
      btnInfo: document.getElementById("btn-info"),
      tutorialOverlay: document.getElementById("tutorial-overlay"),
      btnCloseTutorial: document.getElementById("btn-close-tutorial"),
    };
    this.typingInterval = null;
    this.talkingInterval = null;
    this.pendingCallback = null;
  }

  // Agora o init recebe também o onHomeClick
  init(config, onStartClick, onHomeClick) {
    this.config = config;
    this.els.title.textContent = config.meta.title;
    this.els.narratorName.textContent = config.narrator.name;

    // Configuração do B.Y.T.E.
    this.defaultNarrator = {
      name: config.narrator.name,
      image: config.theme.assets.narrator_image,
    };

    // Configuração do GLITCH
    this.villainNarrator = {
      name: config.theme.assets.villain_name || "GLITCH",
      image: config.theme.assets.villain_image || "",
    };

    // Inicializa com B.Y.T.E.
    this.setNarrator("byte");

    document.getElementById("btn-start").onclick = onStartClick;

    // --- CONFIGURAÇÃO DO BOTÃO HOME ---
    if (this.els.btnHome) {
      this.els.btnHome.onclick = onHomeClick;
    }

    // Monitora mudanças na tela de cards para atualizar a classe da UI
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'style' || mutation.attributeName === 'class') {
          const levelSelect = document.getElementById('level-select');
          const gameUI = document.getElementById('game-ui');
          
          if (levelSelect && gameUI) {
            const isCardsVisible = levelSelect.style.display !== 'none' && 
                                  levelSelect.style.display !== '' &&
                                  levelSelect.classList.contains('active');
            
            if (isCardsVisible) {
              gameUI.classList.add('cards-active');
            } else {
              gameUI.classList.remove('cards-active');
            }
          }
        }
      });
    });

    // Observa mudanças na tela de cards
    const levelSelect = document.getElementById('level-select');
    if (levelSelect) {
      observer.observe(levelSelect, { attributes: true });
    }

    // --- CONFIGURAÇÃO DO BOTÃO NEXT ---
    if (this.els.btnNext) {
      this.els.btnNext.onclick = () => {
        if (this.typingInterval) clearInterval(this.typingInterval);
        this.els.narratorArea.style.display = "none";
        if (this.pendingCallback) {
          const callback = this.pendingCallback;
          this.pendingCallback = null;
          callback();
        }
      };
    }

    // --- CONTROLE DE ÁUDIO ---
    if (this.els.volumeSlider) {
      this.els.volumeSlider.addEventListener("input", (e) => {
        const vol = e.target.value;
        this.game.audio.setGlobalVolume(vol);
        if (vol == 0)
          this.els.btnAudio.innerHTML = '<i class="fas fa-volume-mute"></i>';
        else this.els.btnAudio.innerHTML = '<i class="fas fa-volume-up"></i>';
      });
    }

    if (this.els.btnAudio) {
      this.els.btnAudio.onclick = () => {
        if (this.game.audio.bgm.volume > 0) {
          this.game.audio.lastVol = this.game.audio.bgm.volume;
          this.game.audio.setGlobalVolume(0);
          this.els.volumeSlider.value = 0;
          this.els.btnAudio.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else {
          const vol = this.game.audio.lastVol || 0.5;
          this.game.audio.setGlobalVolume(vol);
          this.els.volumeSlider.value = vol;
          this.els.btnAudio.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
      };
    }

    // --- TUTORIAL ---
    if (this.els.btnInfo) {
      this.els.btnInfo.onclick = () => {
        // Garante que o tutorial fique acima de tudo
        this.els.tutorialOverlay.style.display = "flex";
        this.els.tutorialOverlay.style.zIndex = "10001";
      };
    }

    if (this.els.btnCloseTutorial) {
      this.els.btnCloseTutorial.onclick = () => {
        this.els.tutorialOverlay.style.display = "none";
      };
    }
  }

  showScreen(screenId) {
    document
      .querySelectorAll(".screen")
      .forEach((s) => (s.style.display = "none"));
    document
      .querySelectorAll(".screen")
      .forEach((s) => s.classList.remove("active"));

    const target = document.getElementById(screenId);
    if (target) {
      target.style.display = "flex";
      setTimeout(() => target.classList.add("active"), 10);
    }

    if (screenId === "game-ui") {
      document.getElementById("game-ui").style.display = "block";
    }
  }

  // Destacar quando exploração completa
  updateTracker(score, percent, sceneId) {
    this.els.score.textContent = score;
    this.els.progress.textContent = percent + "%";

    // Quando chegar a 100%, destaca o quiz
    if (percent === 100 && sceneId) {
      this.highlightQuizHotspot();
    }
  }

  // Alterna entre o narrador do vilão e do B.Y.T.E. com base no tipor de fala
  setNarrator(type) {
    if (type === "villain") {
      this.els.narratorName.textContent = this.villainNarrator.name;

      // --- MUDANÇA AQUI: ESCONDE O SPRITE PEQUENO ---
      // Como o vilão está gigante no meio da tela, não mostramos ele embaixo.
      this.els.narratorSprite.style.display = "none";

      // Centraliza o texto já que não tem imagem
      this.els.narratorArea.style.justifyContent = "center";
    } else {
      // Configuração do B.Y.T.E. (Esse continua aparecendo embaixo)
      this.els.narratorName.textContent = this.defaultNarrator.name;

      this.els.narratorSprite.style.display = "block";
      this.els.narratorSprite.style.backgroundImage = `url('${this.defaultNarrator.image}')`;
      this.els.narratorArea.style.justifyContent = "flex-start";

      this.stopTalkingAnimation();
    }
  }

  // Método para garantir que a imagem do B.Y.T.E. seja restaurada
  showNarrator(text, callback, speaker = "byte") {
    if (speaker === "byte") {
      this.els.narratorSprite.style.display = "block";
      this.els.narratorArea.style.justifyContent = "flex-start";
    }

    this.setNarrator(speaker);
    this.pendingCallback = callback;
    this.els.narratorArea.style.display = "flex";
    this.els.narratorText.textContent = "";

    // 1. INICIA A ANIMAÇÃO (Se for o B.Y.T.E.)
    if (speaker === "byte") {
      this.startTalkingAnimation();
    }

    let i = 0;
    if (this.typingInterval) clearInterval(this.typingInterval);

    this.typingInterval = setInterval(() => {
      this.els.narratorText.textContent += text.charAt(i);
      i++;
      if (i >= text.length) {
        clearInterval(this.typingInterval);

        // 2. PARA A ANIMAÇÃO (Texto acabou)
        if (speaker === "byte") {
          this.stopTalkingAnimation();
        }
      }
    }, this.config.narrator.typing_speed);
  }

  startTalkingAnimation() {
    if (this.talkingInterval) clearInterval(this.talkingInterval);

    let currentFrame = 0; // Começa do quadro 0

    // Velocidade: 80ms (aprox 12 FPS) para ficar fluido
    this.talkingInterval = setInterval(() => {
      // 1. Calcula Coluna e Linha sequencialmente
      // 6 colunas (0-5)
      const col = currentFrame % 6;

      // 3 linhas (0-2) -> Divide por 6 e arredonda para baixo
      const row = Math.floor(currentFrame / 6);

      // 2. Chama a função que aplica o CSS
      this.setSpriteFrame(col, row);

      // 3. Avança para o próximo quadro
      currentFrame++;

      // 4. Se chegou no final (18 quadros), volta para o zero
      if (currentFrame >= 18) {
        currentFrame = 0;
      }
    }, 80);
  }

  stopTalkingAnimation() {
    if (this.talkingInterval) clearInterval(this.talkingInterval);
    // Volta para o quadro neutro (0,0) quando para de falar
    this.setSpriteFrame(0, 0);
  }

  setSpriteFrame(col, row) {
    const x = col * 20; // 0%, 20%, 40%, 60%, 80%, 100%

    // Ajuste padrão: 50% para 3 linhas (0%, 50%, 100%)
    const y = row * 50.5;

    if (this.els.narratorSprite) {
      this.els.narratorSprite.style.backgroundPosition = `${x}% ${y}%`;
    }
  }

  renderLevelSelect(cards, backgroundSrc, onSelect) {
    // 1. Atualiza o fundo (Vídeo ou Imagem)
    this.updateBackground(backgroundSrc);

    // 2. Renderiza os cards normalmente
    this.els.cardsContainer.innerHTML = "";
    cards.forEach((card) => {
      const el = document.createElement("div");
      el.className = "level-card";
      el.innerHTML = `
                <img src="${card.image}">
                <p><strong>${card.label}</strong><br><small>${card.description}</small></p>
            `;
      el.onclick = () => onSelect(card);
      this.els.cardsContainer.appendChild(el);
    });
    this.showScreen("level-select");
  }

  // --- NOVO MÉTODO PARA GERENCIAR VÍDEO/IMAGEM ---
  updateBackground(src) {
    const container = document.getElementById("dynamic-background");
    if (!container || !src) return;

    container.innerHTML = ""; // Limpa o fundo anterior

    // Verifica se é vídeo (MP4 ou WEBM)
    if (src.endsWith(".mp4") || src.endsWith(".webm")) {
      const video = document.createElement("video");
      video.src = src;
      video.autoplay = true;
      video.loop = true;
      video.muted = true; // OBRIGATÓRIO para autoplay funcionar no Chrome/Edge
      video.playsInline = true; // OBRIGATÓRIO para funcionar no iPhone
      container.appendChild(video);
    }
    // Se não for vídeo, assume que é imagem
    else {
      const img = document.createElement("img");
      img.src = src;
      container.appendChild(img);
    }
  }

  // Destacar que o quiz foi desbloqueado
  highlightQuizHotspot() {
    // Encontra todos os hotspots de quiz
    const quizHotspots = document.querySelectorAll(
      ".hotspot .fa-clipboard-check, .hotspot .fa-bolt",
    );

    quizHotspots.forEach((icon) => {
      const hotspotButton = icon.closest(".hotspot-button");
      if (hotspotButton) {
        // Adiciona efeito de brilho e pulsação
        hotspotButton.style.animation = "pulseQuiz 1.5s infinite";
        hotspotButton.style.boxShadow = "0 0 30px var(--primary-color)";
        hotspotButton.style.borderColor = "var(--primary-color)";
      }
    });

    // Adiciona a animação se não existir
    if (!document.querySelector("#quiz-pulse-style")) {
      const style = document.createElement("style");
      style.id = "quiz-pulse-style";
      style.textContent = `
        @keyframes pulseQuiz {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  showQuiz(quizData, onCompleteQuiz) {
    this.els.quizOverlay.style.display = "flex";
    // GARANTE que o overlay está VISÍVEL e com z-index adequado
    this.els.quizOverlay.style.zIndex = "10000";
    
    const qElement = document.getElementById("quiz-question");
    const optsElement = document.getElementById("quiz-options");
    
    // Adiciona a classe ao body para controlar z-index
    document.body.classList.add('quiz-active');
    
    // Garante que o narrador do B.Y.T.E. fique ACIMA do quiz
    if (this.els.narratorArea) {
        this.els.narratorArea.style.zIndex = "10001";
    }

    let currentQuestionIndex = 0;
    let mistakesInThisQuiz = 0;
    const totalQuestions = quizData.questions.length;

    const renderQuestion = () => {
        if (currentQuestionIndex >= totalQuestions) {
            // CHAMADA CORRETA - passando mistakesInThisQuiz e totalQuestions
            this.showMissionReport(
                mistakesInThisQuiz,
                totalQuestions,
                onCompleteQuiz,
            );
            return;
      }

      const q = quizData.questions[currentQuestionIndex];
      qElement.textContent = `Questão ${currentQuestionIndex + 1}/${quizData.questions.length}: ${q.text}`;
      optsElement.innerHTML = "";

      // Renderiza opções
      q.options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "quiz-opt";
        btn.textContent = opt.text;

        btn.onclick = () => {
          // Desabilita botões para evitar clique duplo
          const allBtns = optsElement.querySelectorAll("button");
          allBtns.forEach((b) => (b.disabled = true));

          if (opt.correct) {
            btn.classList.add("correct");

            // FEEDBACK VIA NARRADOR (B.Y.T.E.)
            this.showNarrator(
              q.feedback_correct || "Correto! Processando...",
              () => {
                // Callback: Quando fechar o diálogo do B.Y.T.E., vai para a próxima
                currentQuestionIndex++;
                renderQuestion();
                // Reabilita o narrador para o próximo uso se necessário
              },
              "byte",
            );
          } else {
            btn.classList.add("wrong");
            mistakesInThisQuiz++; // Registra erro

            // FEEDBACK VIA NARRADOR
            this.showNarrator(
              q.feedback_wrong || "Dados incorretos. Tente novamente.",
              () => {
                // Callback: Apenas reabilita os botões para tentar de novo
                // Não avança o index
                allBtns.forEach((b) => {
                  if (!b.classList.contains("wrong")) b.disabled = false;
                });
              },
              "byte",
            );
          }
        };
        optsElement.appendChild(btn);
      });
    };

    renderQuestion();
  }

  // --- RELATÓRIO DE MISSÃO ---
  showMissionReport(mistakes, totalQuestions, onCloseReport) {
    const qElement = document.getElementById("quiz-question");
    const optsElement = document.getElementById("quiz-options");
    
    // GARANTE que o modal está visível
    this.els.quizOverlay.style.display = "flex";
    this.els.quizOverlay.style.zIndex = "10000";

    // Pega dados do jogo
    const scene = this.game?.state?.currentSceneId;
    const hotspots =
        this.game?.config?.scenes?.find((s) => s.id === scene)?.hotspots || [];
    const totalHotspots = hotspots.filter((h) => h.action !== "quiz").length;
    const exploredHotspots = this.game?.state
        ? hotspots.filter((h) => this.game.state.visitedHotspots.has(h.id)).length
        : 0;

    const timeSpent = this.game?.state?.getElapsedTime() || "0s";
    const correctAnswers = totalQuestions - mistakes;
    const accuracy =
        totalQuestions > 0
            ? Math.round((correctAnswers / totalQuestions) * 100)
            : 0;

    // Título
    qElement.textContent = "RELATÓRIO DE MISSÃO";
    optsElement.innerHTML = "";

    // Container principal - com fundo mais escuro para garantir visibilidade
    const container = document.createElement("div");
    container.style.cssText = `
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 20px;
        background: rgba(0, 0, 0, 0.8);
        padding: 20px;
        border-radius: 10px;
        border: 1px solid var(--primary-color);
    `;

    // Grid de estatísticas (2 colunas)
    const statsGrid = document.createElement("div");
    statsGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
        width: 100%;
    `;

    // Card 1 - Tempo
    const timeCard = document.createElement("div");
    timeCard.style.cssText = `
        background: var(--glass-bg);
        border: 1px solid var(--primary-color);
        border-radius: 10px;
        padding: 15px;
        text-align: center;
        backdrop-filter: blur(5px);
    `;
    timeCard.innerHTML = `
        <div style="color: var(--accent-color); font-size: 0.8rem; margin-bottom: 5px;">⏱️ TEMPO</div>
        <div style="font-size: 1.8rem; font-weight: bold; color: var(--primary-color);">${timeSpent}</div>
    `;

    // Card 2 - Pontos
    const scoreCard = document.createElement("div");
    scoreCard.style.cssText = timeCard.style.cssText;
    scoreCard.innerHTML = `
        <div style="color: var(--accent-color); font-size: 0.8rem; margin-bottom: 5px;">🎯 PONTOS</div>
        <div style="font-size: 1.8rem; font-weight: bold; color: var(--primary-color);">${this.game?.state?.score || 0}</div>
    `;

    // Card 3 - Exploração
    const explorationCard = document.createElement("div");
    explorationCard.style.cssText = timeCard.style.cssText;
    explorationCard.innerHTML = `
        <div style="color: var(--accent-color); font-size: 0.8rem; margin-bottom: 5px;">🔍 EXPLORAÇÃO</div>
        <div style="font-size: 1.5rem; font-weight: bold;">${exploredHotspots}/${totalHotspots}</div>
        <div style="font-size: 0.7rem; opacity: 0.7;">locais</div>
    `;

    // Card 4 - Quiz
    const quizCard = document.createElement("div");
    quizCard.style.cssText = timeCard.style.cssText;
    quizCard.innerHTML = `
        <div style="color: var(--accent-color); font-size: 0.8rem; margin-bottom: 5px;">❓ QUIZ</div>
        <div style="font-size: 1.5rem; font-weight: bold;">${correctAnswers}/${totalQuestions}</div>
        <div style="font-size: 0.7rem; opacity: 0.7;">acertos</div>
    `;

    // Monta o grid
    statsGrid.appendChild(timeCard);
    statsGrid.appendChild(scoreCard);
    statsGrid.appendChild(explorationCard);
    statsGrid.appendChild(quizCard);

    // Linha divisória
    const divider = document.createElement("div");
    divider.style.cssText = `
        width: 100%;
        height: 2px;
        background: linear-gradient(90deg, transparent, var(--primary-color), transparent);
        margin: 10px 0;
    `;

    // Status de precisão
    const statusCard = document.createElement("div");
    statusCard.style.cssText = `
        background: var(--glass-bg);
        border: 1px solid ${accuracy === 100 ? "var(--success-color)" : accuracy >= 70 ? "var(--accent-color)" : "var(--error-color)"};
        border-radius: 10px;
        padding: 20px;
        text-align: center;
        backdrop-filter: blur(5px);
        width: 100%;
    `;

    statusCard.innerHTML = `
        <div style="font-size: 1.3rem; font-weight: bold; color: ${accuracy === 100 ? "var(--success-color)" : accuracy >= 70 ? "var(--accent-color)" : "var(--error-color)"}; margin-bottom: 5px;">
            ${accuracy === 100 ? "🏆 PERFEITO!" : accuracy >= 70 ? "📊 ESTÁVEL" : "⚠️ INSTÁVEL"}
        </div>
        <div style="font-size: 1rem; opacity: 0.9;">Precisão: ${accuracy}%</div>
        <div style="font-size: 0.9rem; opacity: 0.7; margin-top: 5px;">
            ${mistakes === 0 ? "Nenhum erro" : `${mistakes} erro(s)`}
        </div>
    `;

    // Botão
    const closeBtn = document.createElement("button");
    closeBtn.className = "cta-button";
    closeBtn.textContent = "FINALIZAR MISSÃO";
    closeBtn.style.cssText = `
        width: 100%;
        max-width: 300px;
        margin: 0 auto;
    `;

    closeBtn.onclick = () => {
        // Remove a classe quando o quiz fechar
        document.body.classList.remove('quiz-active');
        
        // Restaura z-index normal do narrador
        if (this.els.narratorArea) {
            this.els.narratorArea.style.zIndex = "400";
        }
        
        this.els.quizOverlay.style.display = "none";
        onCloseReport(true);
    };

    // Monta tudo
    container.appendChild(statsGrid);
    container.appendChild(divider);
    container.appendChild(statusCard);

    const btnWrapper = document.createElement("div");
    btnWrapper.style.cssText = "display: flex; justify-content: center; width: 100%; margin-top: 10px;";
    btnWrapper.appendChild(closeBtn);
    container.appendChild(btnWrapper);

    optsElement.appendChild(container);
  }
}
