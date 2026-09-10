import { createSignal } from "solid-js";
import { TextEditor } from "../common/TextEditor/TextEditor"
import { reactorApiTarget } from "../../../lib/api-messages/apiMessageConfig";

export function Scripts(){
    return (
        <TextEditor 
            allowFileCreation={true}
            runtimeInfo={{}}
            targetEndpoint="/recipes"
            target={reactorApiTarget}
        ></TextEditor>
    )
}
