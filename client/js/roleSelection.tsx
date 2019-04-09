import * as React from "react";
import { User, appendMessage } from "./client";

type Props = {
  user: User;
};

type State = {
  roles: Array<{ roleName: string; color: string }>;
  roleButtons: Array<JSX.Element>;
  key: number;
  roleNames: Array<string>;
  display: string;
};

class RoleSelection extends React.Component<Props, State> {
  constructor(props: any) {
    super(props);
    this.state = { roleButtons: [], key: 0, roleNames: [], display: "none", roles: [] };
    this.props.user.socket.on(
      "makeHost",
      (roles: Array<{ roleName: string; color: string }>) => {
        this.addButtons(roles);
        this.setState({ display: "inherit" });
      },
    );
  }

  addButtons = (roles: Array<{ roleName: string; color: string }>) => {
    let buttons = [];
    let key = this.state.key;
    for (let role of roles) {
      buttons.push(
        <button
          className="ui blue button"
          key={key++}
          onClick={this.handleRoleClick}
          style={{ backgroundColor: role.color }}
        >
          {role.roleName}
        </button>,
      );
    }
    this.setState({ roles: roles });
    this.setState({ roleButtons: buttons });
    this.setState({ key: key });
  };

  handleRoleClick = (e: any) => {
    let newRoleNames = this.state.roleNames.slice();
    let target = e.target;
    newRoleNames.push(target.textContent as string);
    this.setState({
      roleNames: newRoleNames,
    });
    appendMessage([{ text: target.textContent as string, color: (this.state.roles.find(elem => elem.roleName == target.textContent as string) as { roleName: string; color: string }).color as string }], "#roleNames");
  };

  render() {
    return (
      <div
        className="header"
        style={{
          maxHeight: "60%",
          overflowY: "scroll",
          display: this.state.display,
          paddingBottom: "5px",
          marginTop: "100px",
          paddingLeft: "5px",
          left: "35%",
          backgroundColor: "#212121",
          color: "#cecece",
          fontFamily: "IBM Sans Plex', sans-serif",
          fontSize: "20px",
          width: "30%",
          position: "absolute",
          border: "2px solid black",
        }}
      >
        <p>You are the host. Role selection:</p>
        <br />
        <div className="ui form">
          <h4>Default</h4>
          <p>
            Pressing the defalt button will start with the default rolelist (if
            there are enough players):
          </p>
          <button
            className="ui blue button"
            onClick={() => {
              this.props.user.socket.emit("useDefaultRoleList");
            }}
            disabled
          >
            Default
          </button>
          <br /> <h4>Custom</h4>
          <p>
            Select as many roles as you have players, then hit submit to start:
          </p>
          <div id="allRolesForGameType">{this.state.roleButtons}</div>
          <br />
          <button
            className="ui blue button"
            onClick={() => {
              this.props.user.socket.emit(
                "supplyRoleList",
                this.state.roleNames,
              );
            }}
            disabled
          >
            Submit
          </button>
        </div>
      </div>
    );
  }
}

export default RoleSelection;
