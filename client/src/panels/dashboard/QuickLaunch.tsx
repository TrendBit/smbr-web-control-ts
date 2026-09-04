import { createEffect, createSignal, For } from "solid-js";
import { Button } from "../../../lib/web-components/Button/Button";
import { GridElement } from "../../components/GridstackGrid/GridstackGrid"
import { Icon } from "../../components/Icon/Icon";
import { type Popup, Widget } from "../common/Widget";

import styles from "./QuickLaunch.module.css"
import { RefreshProvider, refreshValueUpdate, useRefreshContext } from "../../../lib/web-components/other/RefreshProvider";
import { Recipes } from "../../../lib/api-messages/recipes/_";
import { Scheduler } from "../../../lib/api-messages/scheduler/_";
import { sleep } from "../../../lib/web-components/other/utils";
import { ApiInvalidStatusCodeError } from "../../../lib/api-messages/apiMessageBase";

interface QuickLaunchProps{
    id: string;
}

function parseMacroName(fileName : string){
    return fileName.substring(7).replaceAll("|","/");
}

function QuickLaunchBody(props: QuickLaunchProps){
    const [scripts, setScripts] = createSignal<string[]>([]);

    
    const [searchText, setSearchText] = createSignal<string>("");

    const  [scheduledScript, setScheduledScript] = createSignal<string>("---");
    const  [scriptState, setScriptState] = createSignal<string>("---");

    const [errorMessages, setErrorMessages] = createSignal<Popup[]>([]);

    const refreshCntxt = useRefreshContext();

    async function refreshFileList(){
        let response = await Recipes.sendGetFileList({reloadFromFileSystem:false});
        let filtered = response.recipes.filter((value:string)=>{return value.substring(0,7) === "macros|"})
        
        setScripts(filtered);
    }

    async function refreshSelected(){
        let response = await Scheduler.sendRuntimeInfo();
        setScriptState(response.state);
        setScheduledScript(response.name);
    }



    async function refreshAll(delayed: boolean){
        if(delayed){
            await sleep(1000);
        }
        await Promise.all([
            refreshFileList(),
            refreshSelected()
        ])
    }

    function handleError(error : unknown, message : string){
        if(error instanceof ApiInvalidStatusCodeError){
            if(error.responseMessage){
                setErrorMessages([
                    ...errorMessages(),
                    {
                        message: message,
                        details: error.responseMessage,
                        severity: "error"
                    }
                ])
            }
        }
    }

    async function stop(){
        try {
            await Scheduler.sendStopScheduled();
        } catch (error) {
            handleError(error,"unable to stop script");
            throw error;
        }
        await refreshAll(true);
        return true;
    }


    async function start(){
        try {
            await Scheduler.sendStartScheduled();
        } catch (error) {
            handleError(error,"unable to start script");
            throw error;
        }
        await refreshAll(true);
        return true;
    }

    async function selectScript(fileName : string){
        try {
            await Scheduler.sendSetScheduled({fileName: fileName});
        } catch (error) {
            handleError(error,`unable to schedule script "${fileName}"`);
            throw error;
        }
        await refreshAll(true);
        return true;
    }

    createEffect(async ()=>{
        if(!refreshValueUpdate(refreshCntxt?.listen())){
            return
        }

        await refreshAll(false);      
    })

    return (
        <Widget 
                name="Quick launch"
                hotbarTargets={()=>(
                    <>
                        <Button 
                            callback={start}
                            tooltip="Start the currently selected script"
                        >
                            <Icon scale={1.6} name="play_arrow"></Icon>
                        </Button>
                        <Button 
                            callback={stop}
                            tooltip="Pause the currently selected script"
                        >
                            <Icon scale={1.6} name="pause"></Icon>
                        </Button>
                    </>
                )}
                customRefreshProvider={true}
                popupPanel={{
                    getter: errorMessages,
                    setter: setErrorMessages
                }}
            >
            <div class={styles.selected_script}>
                <b>Selected script</b>
                <p>{scheduledScript()}</p>
            </div>
            <div class={styles.current_state}>
                <b>Current state</b>
                <p>{scriptState()}</p>
            </div>
            <div class={styles.macros_gallery_header}>
                <b>Macros gallery</b>
                <p>(includes files saved in macros folder) </p>
            </div>
            <div class={styles.macros_gallery_container}>
                <input 
                    type="text" 
                    class="button" 
                    placeholder="start typing to search..."
                    oninput={e => setSearchText("macros|"+e.currentTarget.value)}
                ></input>
                <div class={styles.macros_gallery_body}>
                    <For each={scripts()}>
                        {(script, index)=>(
                            <button 
                                classList={{
                                    ["button"]:true,
                                    [styles.macro]: true,
                                    [styles.active]: script === scheduledScript(),
                                    [styles.hidden]: searchText() !== "" && !script.includes(searchText())
                                }}
                                onclick={()=>selectScript(script)}
                            >
                                <p>{parseMacroName(script)}</p>
                            </button>
                        )}
                    </For>
                </div>
            </div>
        </Widget>
    )
}

export function QuickLaunch(props : QuickLaunchProps){
    return(
        <GridElement id={props.id} w={1} h={5}>
            <RefreshProvider>
                <QuickLaunchBody {...props}></QuickLaunchBody>
            </RefreshProvider>
        </GridElement>
    )
}
