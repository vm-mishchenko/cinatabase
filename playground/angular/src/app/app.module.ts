import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { Database } from 'cinatabase';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor() {
    const db = new Database();

    db.doc('test').get().then((data) => {
      console.log(data);
    });

    /*db.doc('test')
      .update({
        foo: 'foo',
      })
      .then(() => {
        db.doc('test').get().then((data) => {
          console.log(data);
        });
      });*/
  }
}
