import { createEffect, createSignal, For, Show } from "solid-js";
import { GridElement } from "../../components/GridstackGrid/GridstackGrid"
import { type Module } from "../../../lib/common-types/Module";
import { ApiSlider } from "../../components/ApiSlider/ApiSlider";
import { Widget } from "../common/Widget";

import styles from "./PumpModule.module.css"
import { useRefreshContext, refreshValueUpdate } from "../../../lib/web-components/other/RefreshProvider";
import { Pumps } from "../../../lib/api-messages/pumps/_";
import { sendApiMessageSimple } from "../../../lib/api-messages/apiMessageSimple";
import { isNumber } from "chart.js/helpers";
import { Icon } from "../../components/Icon/Icon";
import { reactorApiTarget } from "../../../lib/api-messages/apiMessageConfig";

interface PumpModuleBodyProps {
    module : Module
}

export function PumpModuleBody(props : PumpModuleBodyProps){
    const [ pumpCount , setPumpCount ] = createSignal<number | undefined>();
    const [ pumpCountErr , setPumpCountErr ] = createSignal<boolean>(false);
    const refreshCntx = useRefreshContext();

    const pumpArr = [1,2,3,4];

    let lastUpdate = 0;
    
    createEffect(async () => {
        if(!refreshValueUpdate(refreshCntx?.listen(),{length: 15000,lastUpdate: lastUpdate})){
            return
        }
        lastUpdate=Date.now();

        let result = await sendApiMessageSimple({
            url: Pumps.getPumpUrl(props.module.instance,undefined,"pump_count"),
            key: "pump_count",
            target:reactorApiTarget
        })
        if(isNumber(result)){
            setPumpCount(result);
        }
    })

    return (
        <div class={styles.container}>
            <For each={pumpArr}>
                {(el,index)=>(
                    <Show 
                        when={index() < (pumpCount() ?? 0)}
                        fallback={
                            <div class={styles.not_installed_container}>
                                <div class={styles.slot_border}></div>
                                <div class={styles.not_installed_body}>
                                    <Icon 
                                        class={styles.icon}
                                        name="devices_off"
                                    ></Icon>
                                    <p>not</p>
                                    <p>installed</p>
                                </div>
                                <div class={styles.slot_border}></div>
                            </div>
                        }
                    >    
                    <ApiSlider
                        class={styles.slider}
                        direction="V"
                        title={"Pump " + el}
                        
                        bounds={{min: -1, max: 1, show: true}}
                        step={0.05}
                        decimals={2}
                        
                        target={{
                            getter:{url:Pumps.getPumpUrl(props.module.instance,el,"speed"),key:"speed",target:reactorApiTarget},
                        }}
                    ></ApiSlider>
                        
                    </Show>
                )}
            </For>
        </div>
    )
}

export interface PumpModuleProps extends PumpModuleBodyProps{
    id : string,
}

export function PumpModule(props : PumpModuleProps){
    return (
        <GridElement id={props.id} w={1} h={3}>
            <Widget 
                name="PumpModule"
                module={props.module}
            >
                <PumpModuleBody
                    {...props}
                ></PumpModuleBody>
            </Widget>
        </GridElement>
    )
}
