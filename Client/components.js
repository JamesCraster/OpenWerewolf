"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const React = __importStar(require("react"));
class LobbyItem extends React.Component {
    render() {
        return (
        //have to ignore as tsx does not permit custom props on div
        //@ts-ignore
        React.createElement("div", { className: "lobbyItem", inplay: "false", name: this.props.name, type: this.props.type, ranked: this.props.ranked, uid: this.props.uid },
            React.createElement("div", { className: "lobbyItemHeader" },
                React.createElement("p", null,
                    React.createElement("span", { className: "gameName" }, this.props.name),
                    React.createElement("span", { className: "inPlay" }, " OPEN "))),
            React.createElement("p", { className: "lobbyItemBody" },
                " ",
                "Players: ",
                React.createElement("span", null),
                React.createElement("span", { id: "gameType" }, this.props.type))));
    }
}
exports.default = LobbyItem;
//# sourceMappingURL=components.js.map