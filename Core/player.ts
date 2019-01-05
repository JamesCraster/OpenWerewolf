import { User, Message } from "./user";
import { Color } from "./utils";

/*
  Copyright 2017-2018 James V. Craster
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License. 
*/

export class Player {
  protected _user: User;
  constructor(user: User) {
    this._user = user;
  }
  /*public canVote() {
    return this._user.canVote();
  }
  public cannotVote() {
    this._user.cannotVote();
  }*/
  get user() {
    return this._user;
  }
  /*public headerSend(message: Message) {
    this._user.headerSend(message);
  }
  public leftSend(message: string, textColor?: Color, backgroundColor?: Color) {
    this._user.leftSend(message, textColor, backgroundColor);
  }
  public send(text: Message | string,
    textColor?: Color,
    backgroundColor?: Color,
    usernameColor?: Color,){
        this._user.send()

  }*/
}
