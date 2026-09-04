// entities/npc.js — friendly, talkable characters (villagers, the "System"
// narrator used for boss-defeat cutscenes). Who exists and what they say is
// data (see config/level-layout.js) — this class is just the behavior.

class NPC {
  constructor(x, y, name, sheet, dialogue, opts = {}) {
    this.x = x;
    this.y = y;
    this.w = 24;
    this.h = 28;
    this.name = name;
    this.dialogue = dialogue;
    this.anim = new AnimatedSprite(sheet, 32, 34);
    this.dir = opts.dir || 'down';
    this.questGiver = opts.questGiver || false;
    this.hasQuest = opts.hasQuest || false;
    this.bob = 0;
    this.t = Math.random() * 100;
  }
  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }
  update() {
    this.t += 0.02;
    this.bob = Math.sin(this.t) * 1.2;
  }
  draw(ctx, camX, camY) {
    const drawX = this.x - camX - 4;
    const drawY = this.y - camY - 8 + this.bob;
    this.anim.draw(ctx, drawX, drawY, this.dir, false);

    if (this.talked) return; // bubble only shows before the first completed talk
    this._drawTalkBubble(ctx, camX, camY);
  }

  _drawTalkBubble(ctx, camX, camY) {
    ctx.save();

    const text = 'E';
    const floatY = Math.sin(Date.now() / 350) * 3;

    ctx.font = 'bold 13px sans-serif';
    const padding = 10;
    const bubbleW = ctx.measureText(text).width + padding * 2;
    const bubbleH = 22;

    const npcX = this.x - camX + this.w / 2;
    const npcY = this.y - camY;

    const bx = npcX - bubbleW / 2;
    const by = npcY - 30 + floatY;

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, bx + 1, by + 2, bubbleW, bubbleH, 8);
    ctx.fill();

    // dark prompt bubble
    ctx.fillStyle = 'rgba(30,30,30,0.85)';
    roundRect(ctx, bx, by, bubbleW, bubbleH, 8);
    ctx.fill();

    // border
    ctx.strokeStyle = 'rgba(232,228,216,0.6)';
    ctx.lineWidth = 1;
    roundRect(ctx, bx, by, bubbleW, bubbleH, 8);
    ctx.stroke();

    // pointer
    ctx.beginPath();
    ctx.moveTo(npcX - 5, by + bubbleH);
    ctx.lineTo(npcX, by + bubbleH + 5);
    ctx.lineTo(npcX + 5, by + bubbleH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(30,30,30,0.85)';
    ctx.fill();

    // text
    ctx.fillStyle = '#e8c93c';
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(text, npcX, by + 15);

    ctx.restore();
  }
}
