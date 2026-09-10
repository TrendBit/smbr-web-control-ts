import { webControlApiTarget } from "../../../lib/api-messages/apiMessageConfig";
import { TextEditor } from "../common/TextEditor/TextEditor";

export function Config(){
    return (
        <TextEditor 
            twoColFileList={true}
            targetEndpoint="/config-files"
            target={webControlApiTarget}
            allowFileCreation={false}
            allowFileDeletion={false}
        ></TextEditor>
    )
}
