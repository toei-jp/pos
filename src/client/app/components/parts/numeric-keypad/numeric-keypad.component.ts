import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';

@Component({
    selector: 'app-numeric-keypad',
    templateUrl: './numeric-keypad.component.html',
    styleUrls: ['./numeric-keypad.component.scss']
})
export class NumericKeypadComponent implements OnInit {
    public isOpen: boolean;
    public position: { y: number; x: number; };
    @Input() public inputValue: string;
    @Output() public change = new EventEmitter<string>();
    @Output() public hidden = new EventEmitter<string>();
    @ViewChild('trigger') private trigger: { nativeElement: HTMLElement };
    constructor() { }

    public ngOnInit() {
        this.isOpen = false;
        this.position = { y: 0, x: 0 };
        if (this.inputValue === '0') {
            this.inputValue = '';
        }
    }

    public show() {
        const height = this.trigger.nativeElement.clientHeight;
        const rect = this.trigger.nativeElement.getBoundingClientRect();
        // const scrollTop = window.pageYOffset || (<HTMLElement>document.documentElement).scrollTop;
        // const scrollLeft = window.pageXOffset || (<HTMLElement>document.documentElement).scrollLeft;
        this.position = {
            y: rect.top + height,
            x: rect.left
        };
        this.isOpen = true;
    }

    public hide() {
        this.isOpen = false;
        this.hidden.emit(this.inputValue);
    }

    public inputNumber(number: string) {
        this.inputValue = String(Number(this.inputValue + number));
        this.change.emit(this.inputValue);
    }

    public clear() {
        if (this.inputValue.length === 0) {
            return;
        }

        this.change.emit(this.inputValue.slice(0, -1));
    }

}
