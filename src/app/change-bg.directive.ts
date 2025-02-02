import { Directive, ElementRef, HostListener, Input, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appChangeBg]'
})
export class ChangeBgDirective {
  // @Input() isCorrect: boolean = false;
  // @Input() showCorrectAnswer: boolean = false;
  @Input() isMarked: boolean = false;

  constructor(private el: ElementRef, private render: Renderer2) { }
  // @HostListener('click') answer() {
  //   if (this.isCorrect) {
  //     this.setCorrectStyle();
  //   } else {
  //     this.setIncorrectStyle();
  //   }
  @HostListener('click') toggleMark() {
    this.isMarked = !this.isMarked;
    this.updateStyle();
  }

  private updateStyle() {
    if (this.isMarked) {
      this.render.setStyle(this.el.nativeElement, 'background', 'yellow');
    } else {
      this.render.removeStyle(this.el.nativeElement, 'background');
    }
  }
}
