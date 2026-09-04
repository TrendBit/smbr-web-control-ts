import { For, Show } from "solid-js";
import type { JSX, JSXElement } from "solid-js";

import { Icon } from "../../components/Icon/Icon";
import { Button } from "../../../lib/web-components/Button/Button";

import styles from './Widget.module.css'
import { ApiFetcher, type ApiFetcherProps } from "../../components/ApiFetcher/ApiFetcher";
import { RefreshProvider, useRefreshContext } from "../../../lib/web-components/other/RefreshProvider";
import { instanceToIndex, moduleInstanceColors, type Module } from "../../../lib/common-types/Module";

interface WidgetHotbarValueProps {
    name:string,
    apiFetcherProps: ApiFetcherProps
}

export function WidgetHotbarValue(props: WidgetHotbarValueProps){
    return (
        <div class={styles.apiValue}>
            <p>{props.name}</p>
            <ApiFetcher {...props.apiFetcherProps}></ApiFetcher>
        </div>
    )
}

function WidgetRefreshButton() {
    const refreshCntx = useRefreshContext();
    return (
        <Button 
            callback={async (): Promise<boolean> => {refreshCntx?.refresh(true); return true;}}
            tooltip="Refresh values"
        >
            <Icon scale={1.2} name="autorenew"></Icon>
        </Button>
    )
}

function RefreshProviderWrapper(props : {wrap : boolean, children : any}){
    return(
        <Show when={props.wrap} fallback={props.children}>
            <RefreshProvider>
                {props.children}
            </RefreshProvider>
        </Show>
    )
}


interface WidgetProps {
    children?: JSX.Element;
    hotbarTargets?: () => JSXElement;
    name: string;
    customRefreshProvider?: boolean;
    popupPanel?: PopupPanelProps;
    module?: Module
}

export function Widget(props: WidgetProps) {
    return (
        <RefreshProviderWrapper wrap={!(props.customRefreshProvider ?? false)}>
            <div class={styles.container}>
            
                <div 
                    class={styles.header}
                    style={{
                        "border-bottom": (props.module !== undefined) ? (
                            `3px solid ${moduleInstanceColors[props.module.instance]}`
                        ) : (
                            undefined
                        )
                    }}
                >
                    <div class={styles["drag-handle"] + " drag-handle"}>
                        <Icon name="open_with"></Icon>
                    </div>
                    <h2 class={styles.title}>{props.name}</h2>
                    <Show when={instanceToIndex[props.module?.instance ?? "Undefined"] > 0}>
                        <div 
                            class={styles["instace-display"]}
                            style={{
                                "--instance-color": moduleInstanceColors[props.module?.instance ?? "Undefined"]
                            }}
                        >
                            <p>{instanceToIndex[props.module?.instance ?? "Undefined"]}</p>
                        </div>
                    </Show>
                    <div class={styles.hotbarPanel}>
                        <Show when={props.hotbarTargets} fallback={<></>}>
                            {props.hotbarTargets?.()}
                        </Show>
                        <WidgetRefreshButton></WidgetRefreshButton>
                    </div>
                </div>
                <div class={styles.body}>
                    <Show when={props.popupPanel!==undefined}>
                        <PopupPanel {...(props.popupPanel as PopupPanelProps)}></PopupPanel>
                    </Show>
                    {props.children}
                </div>
            </div>
        </RefreshProviderWrapper>
    );
}


export interface Popup {
  message: string,
  details: string,
  severity: "error" | "warning" | "info",
}


export interface PopupPanelProps {
    getter : () => Array<Popup>
    setter : (value : Array<Popup>) => void
    timeout ?: number
    width ?: string
    autoHide ?: boolean
}

export function PopupPanel(props : PopupPanelProps){
    function removePopup(index : number){
        let newArr = props.getter();
        console.error(newArr);
        newArr = newArr.filter((_,i)=>(i!==index)); 
        console.error(newArr);
        props.setter(newArr);
    }

    return (
        <div 
            classList={{
                [styles.popup_panel]:true,
                [styles.hidden]:props.getter().length == 0 && (props.autoHide ?? true)
            }}
            style={{
                width: props.width
            }}
        >
            <p class={styles.close_text}>click on a popup to close it</p>
            <For each={props.getter()}>
                {(el,index)=>(
                    <button 
                        classList={{
                            [styles.popup]:true,
                            [styles.info]:el.severity == "info",
                            [styles.warning]:el.severity == "warning",
                            [styles.error]:el.severity == "error"
                        }}
                        onclick={e=>removePopup(index())}
                    >
                        <p class={styles.error_text}>{el.message}</p>
                        <p class={styles.message_text}>{el.details}</p>
                    </button>
                )}
            </For>
        </div>
    )
}
