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

class LobbyItem extends React.Component {

    render() {
        return React.createElement(
            "div",
            { className: "lobbyItem", name: this.props.name,
                inplay: "false", ranked: this.props.ranked, uid: this.props.uid },
            React.createElement(
                "div",
                { className: "lobbyItemHeader" },
                React.createElement(
                    "p",
                    null,
                    React.createElement(
                        "span",
                        { className: "gameName" },
                        this.props.name
                    ),
                    React.createElement(
                        "span",
                        { className: "inPlay" },
                        " OPEN "
                    )
                )
            ),
            React.createElement(
                "p",
                { className: "lobbyItemBody" },
                " ",
                'Players: ',
                React.createElement("span", null),
                React.createElement(
                    "span",
                    { id: "gameType" },
                    this.props.type
                )
            )
        );
    }
}