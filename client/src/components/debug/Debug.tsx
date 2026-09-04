import { createSignal, For, onMount } from "solid-js";
import styles from "./Debug.module.css"
import { moduleInstances, moduleTypes, useModuleListValue, type Module, type moduleInstancesType, type moduleTypesType } from "../other/ModuleListProvider";
import { createServerCookie } from "@solid-primitives/cookies";
import { isArray, isNumber, isObject } from "../../../lib/web-components/other/utils";
import { smbr_apiMessageConfig } from "../../apiMessages/apiMessageConfig";
import type { targetsType } from "../../apiMessages/apiMessageBase";

interface DebugModuleEditorProps{
    class?: string;
}

export function DebugModuleEditor(props : DebugModuleEditorProps){
    const [cookie, setCookie] = createServerCookie("SMBR-moduleList");
    const moduleListCntx = useModuleListValue();
    if(!moduleListCntx){
        return (
            <p style={{"white-space":"wrap"}}>Cannot init without module list context</p>
        )
    }

    function changeModule(module: Module, index: number){
        if(moduleListCntx){
            let newList = [...moduleListCntx.state()];
            newList[index] = module;
            moduleListCntx.actions.setModuleList(newList);
            setCookie(JSON.stringify(newList));
        }
    }

    onMount(()=>{
        let cookieData = cookie();
        if(cookieData){
            if(moduleListCntx){
                console.log(cookieData)
                let parsedCookie : any = {};
                try {
                    parsedCookie = JSON.parse(cookieData)
                } catch (error) {
                    console.error("invalid content of the server cookie: ",cookieData);
                    setCookie("");
                }
                if(!isArray(parsedCookie)){
                    return
                }
                for(let module of parsedCookie as any[]){
                    if(!isObject(module)){
                        return
                    }
                }
                moduleListCntx.actions.setModuleList(parsedCookie)
            }
        }
    })

    function removeModule(index: number){
        if(moduleListCntx){
            let newList : Module[] =[...moduleListCntx.state()];
            newList.splice(index,1);
            moduleListCntx.actions.setModuleList(newList)
            setCookie(JSON.stringify(newList));
        }
    }

    function addModule(){
        if(moduleListCntx){
            let newList : Module[] =[...moduleListCntx.state(),{type:"undefined",instance:"Undefined",uid: "debug"}];
            moduleListCntx.actions.setModuleList(
                newList
            )
            setCookie(JSON.stringify(newList));
        }
    }

    return (
        <div class={styles.module_editor + " " + styles.container + " " + props.class}>
            <p>Loaded modules:</p>
            <For each={moduleListCntx.state()}>
                {(module, index) => (
                    <div class={styles.module}>
                        <div>
                            <div class={styles.input_line}>
                                <p>Type: </p>
                                <select value={module.type} onChange={(e)=>{
                                    let selectedValue = e.currentTarget.value
                                    let newModule : Module = {instance: module.instance,type: selectedValue as moduleTypesType,uid: "debug"};
                                    changeModule(newModule,index());
                                }}>
                                    <For each={moduleTypes}>
                                        {(type) => (
                                            <option value={type}>{type}</option>
                                        )}
                                    </For>
                                </select>
                            </div>
                            <div class={styles.input_line}>
                                <p>Instance: </p>
                                <select value={module.instance} onChange={(e)=>{
                                    let selectedValue = e.currentTarget.value
                                    let newModule : Module = {instance: selectedValue as moduleInstancesType,type:module.type,uid: "debug"};
                                    changeModule(newModule,index());
                                }}>
                                    <For each={moduleInstances}>
                                        {(instance) => (
                                            <option value={instance}>{instance}</option>
                                        )}
                                    </For>
                                </select>
                            </div>
                        </div>
                        <button onclick={()=>removeModule(index())}>
                            X
                        </button>
                    </div>
                )}
            </For>
            <button onclick={addModule}>Add module</button>
        </div>
    )
}

interface DebugApiMessageHostnameEditor{
    class?: string;
}
export function DebugApiMessageHostnameEditor(props :DebugApiMessageHostnameEditor){
    const [cookie, setCookie] = createServerCookie("SMBR-defaultHostname");
    const [currHostWeb, setCurrHostWeb] = createSignal("---");
    const [currHostReactor, setCurrHostReactor] = createSignal("---");
    let inputElWeb !: HTMLInputElement
    let inputElReactor !: HTMLInputElement

    function setWebHostname(value : string){
        if(value!=""){
            console.log("changing web hostname to: ",value);
            let split = value.split(":");
            let hostname = split[0];
            let port = Number(split[1]);
            smbr_apiMessageConfig.defaultHostnames.webControlApi = hostname
            if(isNumber(port)){
                smbr_apiMessageConfig.defaultPorts.webControlApi = port
            }
        }else{
            console.log("changing web hostname back to default");
            smbr_apiMessageConfig.defaultHostnames.webControlApi = window.location.hostname
        }
        setCurrHostWeb(
            smbr_apiMessageConfig.defaultHostnames.webControlApi+
            ":"+
            smbr_apiMessageConfig.defaultPorts.webControlApi
        );
    }

    function setReactorHostname(value : string){
        if(value!=""){
            console.log("changing reactor hostname to: ",value);
            let split = value.split(":");
            let hostname = split[0];
            let port = Number(split[1]);
            smbr_apiMessageConfig.defaultHostnames.reactorApi = hostname
            if(isNumber(port)){
                smbr_apiMessageConfig.defaultPorts.reactorApi = port
            }
        }else{
            console.log("changing reactor hostname back to default");
            smbr_apiMessageConfig.defaultHostnames.reactorApi = window.location.hostname
        }
        setCurrHostReactor(
            smbr_apiMessageConfig.defaultHostnames.reactorApi+
            ":"+
            smbr_apiMessageConfig.defaultPorts.reactorApi
        );
    }

    function updateCookie(){
        setCookie(JSON.stringify({
            web: currHostWeb(),
            reactor: currHostReactor()
        }))
    }

    onMount(()=>{
        try {
            let cookieData = JSON.parse(cookie() ?? "{}")
            if(cookieData.web && cookieData.reactor){
                console.log("parsed debug hosntame cookie: ",cookieData)
                setWebHostname(cookieData.web)
                setReactorHostname(cookieData.reactor)
            }
        } catch (error) {
            let cookieData = cookie();
            if(cookieData){
                console.error("invalid content of the server cookie: ",cookieData);
            }
            setCookie("");
        }
    })

    return (
        <div class={styles.container + " " + props.class}>
            <p>Api message targets:</p>
            <p>Current web:</p>
            <p>{currHostWeb()}</p>
            <div class={styles.horflex}>
                <input class={styles.grow}  ref={inputElWeb}></input>
                <button onclick={()=>{
                    if(inputElWeb){
                        setWebHostname(inputElWeb.value);
                        updateCookie();
                        inputElWeb.value = ""
                    }
                }}>set</button>
            </div>
            <p>Current reactor:</p>
            <p>{currHostReactor()}</p>
            <div class={styles.horflex}>
                <input class={styles.grow}  ref={inputElReactor}></input>
                <button onclick={()=>{
                    if(inputElReactor){
                        setReactorHostname(inputElReactor.value);
                        updateCookie();
                        inputElReactor.value = ""
                    }
                }}>set</button>
            </div>
        </div>
    )
}


interface DebugRefreshProviderIntervalProps{
    class?: string;
    title: string
    interval:{
        getter: () => number;
        setter: (value: number) => void;
    }
    disabled:{
        getter: () => boolean;
        setter: (value: boolean) => void;
    }
}
export function DebugRefreshProviderInterval(props: DebugRefreshProviderIntervalProps){
    const [intervalCookie, setIntervalCookie] = createServerCookie("SMBR-updateInterval-"+props.title);
    const [disabledCookie, setDisabledCookie] = createServerCookie("SMBR-updateDisabled-"+props.title);
    let inputEl !: HTMLInputElement

    function setDisabled(value : boolean, save:boolean){
        console.log("changing refresh provider disabled to: ",value);
        props.disabled.setter(value)
        if(save){
            setDisabledCookie((value)?"true":"false");
        }
    }
    function setInterval(value : number, save:boolean){
        console.log("changing refresh provider interval to: ",value);
        props.interval.setter(value)
        if(save){
            setIntervalCookie(value.toString());
        }
    }

    onMount(()=>{
        let cookieDataInt = intervalCookie()
        let cookieDataDis = disabledCookie()
        if(cookieDataInt){
            console.log(cookieDataInt)
            if(Number(cookieDataInt)){
                setInterval(Number(cookieDataInt),false);
            }
        }
        if(cookieDataDis){
            console.log(cookieDataDis)
            if(cookieDataDis=="true"){
                setDisabled(true,false);
            }
            if(cookieDataDis=="false"){
                setDisabled(false,false);
            }
        }
    })

    return (
        <div class={styles.container + " " + props.class}>
            <p>{props.title}</p>
            <div class={styles.horflex}>
                <p>Do updates: </p>
                <input checked={!props.disabled.getter()} type="checkbox" onchange={e => setDisabled(!e.currentTarget.checked,true)}></input>
            </div>
            <div class={styles.horflex}>
                <input 
                    class={styles.grow} 
                    placeholder={props.interval.getter().toString()}
                    ref={inputEl}
                ></input>
                <button onclick={()=>{
                    if(inputEl){
                        if(Number(inputEl.value)){
                            setInterval(Number(inputEl.value),true);
                            inputEl.value = ""
                        }
                    }
                }}>set</button>
            </div>
        </div>
    )
}
