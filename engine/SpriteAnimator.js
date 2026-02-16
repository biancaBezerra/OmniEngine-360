class SpriteAnimator {
  constructor(element, options = {}) {
    this.element = element;
    this.cols = options.cols || 6;
    this.rows = options.rows || 3;
    this.totalFrames = options.totalFrames || 18;
    this.fps = options.fps || 12;
    this.interval = null;
    this.currentFrame = 0;

    // CÁLCULO DINÂMICO (Corrige o alinhamento para qualquer tamanho de sprite)
    // Se tiver apenas 1 coluna, o passo é 0. Se tiver mais, divide 100% pelo número de intervalos.
    this.stepX = this.cols > 1 ? 100 / (this.cols - 1) : 0;
    this.stepY = this.rows > 1 ? 100 / (this.rows - 1) : 0;
  }

  play() {
    this.stop();
    const ms = 1000 / this.fps;

    this.interval = setInterval(() => {
      const col = this.currentFrame % this.cols;
      const row = Math.floor(this.currentFrame / this.cols);

      // AQUI ESTAVA O ERRO: Removemos os números fixos (20 e 50.5)
      // Agora usamos o cálculo automático baseado no JSON
      const x = col * this.stepX;
      const y = row * this.stepY;

      this.element.style.backgroundPosition = `${x}% ${y}%`;

      this.currentFrame++;
      if (this.currentFrame >= this.totalFrames) {
        this.currentFrame = 0;
      }
    }, ms);
  }

  stop(reset = true) {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    if (reset) {
      this.element.style.backgroundPosition = "0% 0%";
      this.currentFrame = 0;
    }
  }

  addClass(className) {
    this.element.classList.add(className);
  }

  removeClass(className) {
    this.element.classList.remove(className);
  }
}
