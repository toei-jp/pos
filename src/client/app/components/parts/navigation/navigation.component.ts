import { Component, Input, OnInit } from '@angular/core';

@Component({
    selector: 'app-navigation',
    templateUrl: './navigation.component.html',
    styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit {

    @Input() public prevLink?: string;
    @Input() public setting?: boolean;
    @Input() public prev?: boolean;
    @Input() public home?: boolean;
    @Input() public print?: boolean;

    constructor() { }

    public ngOnInit() {
        this.setting = (this.setting === undefined) ? true : this.setting;
        this.prev = (this.prev === undefined) ? true : this.prev;
        this.home = (this.home === undefined) ? true : this.home;
        this.print = (this.print === undefined) ? true : this.print;
    }

}
