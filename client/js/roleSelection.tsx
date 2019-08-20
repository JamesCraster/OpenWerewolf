import * as React from "react";
import { User, appendMessage, players } from "./client";
import RoleDisplay from "./roleDisplay";

type Props = {
  user: User;
};

type State = {
  roles: Array<{ roleName: string; color: string }>;
  selectedRoles: Array<{ roleName: string; color: string }>;
  key: number;
  display: string;
};

class RoleSelection extends React.Component<Props, State> {
  constructor(props: any) {
    super(props);
    this.state = {
      roles: [],
      selectedRoles: [],
      key: 0,
      display: "none",
    };
    //get the roles to add the buttons to the host's panel
    this.props.user.socket.on(
      "makeHost",
      (roles: Array<{ roleName: string; color: string }>) => {
        this.setState({ roles: roles });
        this.setState({ display: "inherit" });
      },
    );
  }
  //handle clicking on the buttons in the host's panel
  handleRoleClick = (e: any) => {
    let newSelectedRoles = this.state.selectedRoles.slice();
    let target = e.target;
    let roleName = target.textContent as string;
    let color = (this.state.roles.find(
      elem => elem.roleName == (target.textContent as string),
    ) as { roleName: string; color: string }).color as string;
    //get priority of the added role (taken from original list of buttons.)
    let position = this.state.roles.findIndex(elem => elem.roleName == roleName);
    //perform correct insertion
    let i = 0;
    while (i < newSelectedRoles.length && this.state.roles.findIndex(elem => elem.roleName == newSelectedRoles[i].roleName) < position) {
      i++;
    }
    newSelectedRoles.splice(i, 0, { roleName: roleName, color: color });
    this.setState({
      selectedRoles: newSelectedRoles,
    });
  };
  //handle removing a role (called within child RoleDisplay)
  removeRole = (e: any) => {
    let newSelectedRoles = this.state.selectedRoles.slice();
    newSelectedRoles.splice(e.target.dataset.index, 1);
    this.setState({
      selectedRoles: newSelectedRoles
    });
  };

  render() {
    let buttons = [];
    let key = 0;
    for (let role of this.state.roles) {
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

    let selectedButtons = [];
    key = 0;
    for (let role of this.state.selectedRoles) {
      selectedButtons.push(
        <li
          className="gameli"
          key={key}
          data-index={key}
          onClick={(e: any) => this.removeRole(e)}
          style={{ color: role.color }}
        >
          <span style={{ color: "#cecece" }}>[X]</span>{" " + role.roleName}
        </li>,
      );
      key++;
    }
    return (
      <div>
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
              Pressing the defalt button will start with the default rolelist
              (if there are enough players):
            </p>
            <button
              className="ui blue button"
              onClick={() => {
                this.props.user.socket.emit("useDefaultRoleList");
              }}
              disabled={!(players.length >= 4)}
            >
              Default
            </button>
            <br /> <h4>Custom</h4>
            <p>
              Select as many roles as you have players, then hit submit to
              start. To remove roles, click on them in the box to the right,
              where they are displayed.
            </p>
            <div id="allRolesForGameType">{buttons}</div>
            <br />
            <button
              className="ui blue button"
              onClick={() => {
                this.props.user.socket.emit(
                  "supplyRoleList",
                  this.state.selectedRoles.map(elem => elem.roleName),
                );
              }}
              disabled={
                !(
                  this.state.selectedRoles.length >= 4 &&
                  this.state.selectedRoles.length == players.length
                )
              }
            >
              Submit
            </button>
          </div>
        </div>
        <RoleDisplay user={this.props.user} buttons={selectedButtons} />
      </div>
    );
  }
}

export default RoleSelection;
