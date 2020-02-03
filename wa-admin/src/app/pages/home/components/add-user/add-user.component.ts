import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ActionService } from 'src/app/services/action.service';
import { AlertService } from 'src/app/services/alert.service';
import { AppConfigService } from 'src/app/services/app-config.service';
import { StateService } from 'src/app/services/state.service';
import formTemplate from 'src/assets/config/form-template';

@Component({
  selector: 'waa-add-user',
  template: `
    <waa-item-header title="Invite"> </waa-item-header>
    <waa-view-wrapper>
      <div class="view-wrapper">

        <mat-card [formGroup]="formGroup" *ngIf="index === 0; else preview">
            <waa-card-toolbar title="Invite User"> </waa-card-toolbar>

            <div *ngFor="let form_elem of formTemplate">
              <div [ngSwitch]="form_elem.type">
                <div *ngSwitchCase="'textInput'">
                  <ion-item>
                    <ion-label position="stacked">{{form_elem.label}}<ion-text color="danger">*</ion-text></ion-label>
                    <ion-input formControlName="{{form_elem.label}}" placeholder="{{form_elem.placeholder}}" (keyup.enter)="submit(formGroup)"></ion-input>
                    <ion-note *ngIf="(invalid && formGroup['controls'][form_elem.label].invalid) || (formGroup['controls'][form_elem.label].touched && formGroup['controls'][form_elem.label].invalid)">
                      <ion-text color="danger">Invalid {{form_elem.label}}</ion-text>
                    </ion-note>
                  </ion-item>
                </div>
                <div *ngSwitchCase="'radio'">
                  <ion-item>
                    <ion-label position="stacked">{{form_elem.label}}<ion-text color="danger">*</ion-text></ion-label>
                    <ion-radio-group no-padding formControlName="method">
                      <ion-item lines="none" *ngFor="let radioElement of form_elem.options">
                        <ion-radio value="{{radioElement.value}}" slot="start"></ion-radio>
                        <ion-label *ngIf="radioElement.label">{{radioElement.label}}</ion-label>
                        <ion-icon *ngIf="radioElement.logo" name="{{radioElement.logo}}"></ion-icon>
                      </ion-item>
                    </ion-radio-group>
                    <ion-note *ngIf="(invalid && formGroup['controls'][form_elem.label].invalid) || (formGroup['controls'][form_elem.label].touched && formGroup['controls'][form_elem.label].invalid)">
                      <ion-text color="danger">Invalid {{form_elem.label}}</ion-text>
                    </ion-note>
                  </ion-item>
                </div>
              </div>
            </div>
        </mat-card>

          <ion-footer>
            <ion-toolbar color="secondary">
              <ion-buttons slot="secondary" *ngIf="this.index">
                <ion-button (click)="this.index = 0">
                  <mat-icon>arrow_back_ios</mat-icon>
                  <ion-label>Back</ion-label>
                </ion-button>
              </ion-buttons>
              <ion-buttons slot="primary">
                <ion-button (click)="submit(formGroup)">
                  <ion-label slot="start">{{ nextLabel }}</ion-label>
                  <mat-icon>arrow_forward_ios</mat-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-footer>

      </div>
    </waa-view-wrapper>

    <ng-template #preview>
      <waa-add-user-preview
        [email]="formGroup.value['email']"
        [firstName]="formGroup.value['firstName']"
        [lastName]="formGroup.value['lastName']"
        link="{{ url }}new-link"
        state="unsubmitted"
        [fields]="fields"
      >
      </waa-add-user-preview>
    </ng-template>
  `,
  styleUrls: ['./add-user.component.scss']
})
export class AddUserComponent implements OnInit {
  // title = 'Add user';
  formGroup: FormGroup;
  formTemplate: any = formTemplate;
  index = 0;
  invalid: boolean;
  url: string;

  constructor(
    private actionSvc: ActionService,
    private stateSvc: StateService,
    private alertSvc: AlertService,
    private router: Router
  ) {
  }

  ngOnInit() {
    this.url = AppConfigService.settings.publicSite.url;

    this.buildFormFromTemplate();
  }

  buildFormFromTemplate() {
    let formGroup = {};
    formTemplate.forEach(formItem => {
      formGroup[formItem.label] = new FormControl('', formItem.validators);
    });
    this.formGroup = new FormGroup(formGroup);
  }

  async submit(formGroup) {
    if (formGroup.invalid) {
      formGroup.markAsTouched();
      formGroup.updateValueAndValidity();
      this.invalid = true;
      return (this.formGroup = formGroup);
    }

    const { method, jurisdiction, email, firstName, lastName } = this.formGroup.value;
    if (this.index === 0) {
      this.index = 1;
    } else {
      const addedBy = this.stateSvc.user.username;
      try {
        const response = await this.actionSvc
          .createInvitation({
            method,
            jurisdiction,
            email,
            firstName,
            lastName,
            addedBy
          })
          .toPromise();
        const created = new Date();
        const expiry = new Date();
        expiry.setDate(created.getDate() + 1);

        const res = await this.alertSvc.confirmBox({
          header: 'Invitation Sent!',
          message: 'Would you like to create another user?',
          decline: 'Home',
          confirm: 'Add another'
        });
        if (res) return this.resetState();
        return this.router.navigate(['/']);
      } catch (err) {
        console.log(err);
        this.alertSvc.error({
          header: 'An error occurred adding the user',
          message: err.error.error.message
        });
      }
    }
  }

  resetState() {
    this.buildFormFromTemplate();
    this.index = 0;
  }

  get nextLabel() {
    return !this.index ? 'Next' : 'Submit';
  }

  get fields() {
    const created = new Date();
    const expiry = new Date(created);
    expiry.setDate(created.getDate() + 1);
    return [
      {
        key: 'method',
        value: this.formGroup.value['method']
      },
      {
        key: 'jurisdiction',
        value: this.formGroup.value['jurisdiction']
      },
      {
        key: 'expiry',
        value: expiry
      },
      {
        key: 'created',
        value: created
      },
      {
        key: 'addedBy',
        value: this.stateSvc.user.email
      }
    ];
  }
}
