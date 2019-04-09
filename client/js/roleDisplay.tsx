import * as React from "react";
import { User, appendMessage } from "./client";
import { listenerCount } from "cluster";

type Props = {
    user: User;
    buttons: any
};

type State = {
    messages: Array<{ text: string; color?: string }>;
    roleButtons: Array<JSX.Element>;
    roleNames: Array<string>;
};

class RoleDisplay extends React.Component<Props, State> {
    constructor(props: any) {
        super(props);
    }
    render() {
        return (
            <div id="leftBox" className="sideBox" style={{ width: "10%", position: "absolute", right: "0px", top: "40px" }}>
                <div id="innerLeftBox" className="innerSideBox" style={{ overflowY: "auto", width: "90%", marginRight: "auto", marginLeft: "0px" }}>
                    < ul id="roleNames" >
                        <li className="gameli" >Roles: </li>
                        {this.props.buttons}
                    </ul >
                </div >
            </div >);
    }
}

export default RoleDisplay;
