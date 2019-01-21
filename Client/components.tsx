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
import * as React from "react";
type Props = {
  name: string;
  type: string;
  ranked: boolean;
  uid: string;
};
export default class LobbyItem extends React.Component<Props, {}> {
  render() {
    return (
      <div
        className="lobbyItem"
        name={this.props.name}
        inplay="false"
        type={this.props.type}
        ranked={this.props.ranked}
        uid={this.props.uid}
      >
        <div className="lobbyItemHeader">
          <p>
            <span className="gameName">{this.props.name}</span>
            <span className="inPlay"> OPEN </span>
          </p>
        </div>
        <p className="lobbyItemBody">
          {" "}
          {"Players: "}
          <span />
          <span id="gameType">{this.props.type}</span>
        </p>
      </div>
    );
  }
}
