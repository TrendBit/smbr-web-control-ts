import { createEffect, createSignal } from "solid-js"
import { GridElement } from "../../components/GridstackGrid/GridstackGrid"
import { ApiSlider } from "../../components/ApiSlider/ApiSlider"
import { Widget } from "../common/Widget"
import { ApiValueController } from "../../components/ValueController/ValueControlller"
import { sendApiMessage } from "../../../lib/api-messages/apiMessageBase"
import { Sensor_Heater } from "../../../lib/api-messages/sensor/heater"
import { RefreshProvider, refreshValueUpdate, useRefreshContext } from "../../../lib/web-components/other/RefreshProvider"
import { Control_Mixer } from "../../../lib/api-messages/control/mixer"

import styles from "./Control.module.css"

interface ControlProps{
    id : string
}

interface ControlBodyProps {
}

export function ControlBody(props : ControlBodyProps){
    const [mixerMinMax, setMixerMinMax] = createSignal<{
        min: number,
        max: number
    } | undefined>()

    const refreshCntxt = useRefreshContext();

    createEffect(async ()=>{
        if(!refreshValueUpdate(refreshCntxt?.listen())){
            return
        }

        try {
            let response = await Control_Mixer.sendInfo();
            setMixerMinMax({
                min: response.minRPM,
                max: response.maxRPM
            })
        } catch (error) {
            setMixerMinMax(undefined)
            throw error;
        }
    })


    return (
        <Widget name="Control" customRefreshProvider={true}>
            <div
                class={styles.container} 
                style={{
                    display: "flex",
                    "flex-direction": "column",
                    flex: "1 0 auto",
                    gap: "10px"
                }}
            >
                <ApiSlider 
                    target={{
                        getter: {url:"/control/aerator/speed", key:"speed"}
                    }}
                    title="Aerator" 
                    direction="H"
                    bounds={{min: 0, max: 1}} 
                    step={0.05}
                ></ApiSlider>
                
                <ApiSlider
                    target={{
                        getter: {url:"/control/mixer/speed", key:"speed"}
                    }}
                    title="Mixer" 
                    direction="H" 
                    bounds={{min: 0, max: 1}} 
                    step={0.05}
                ></ApiSlider>
                
                <ApiSlider 
                    target={{
                        getter: {url:"/control/cuvette_pump/speed", key:"speed"}
                    }}
                    title="Cuvette pump" 
                    direction="H" 
                    bounds={{ min: -1, max: 1 }}
                    deadzones={[
                        {range: 0.15, snapPoint: 0}
                    ]}
                    step={0.05}
                ></ApiSlider>

                <ApiValueController
                    title="Mixer target rpm"
                    buttonTooltip="turn off the mixer"
                    valueName="current target"
                    buttonText="turn off"
                    min={mixerMinMax()?.min}
                    max={mixerMinMax()?.max}
                    unit="rpm"
                    getter={{url:"/control/mixer/rpm",key:"rpm"}}
                    onClick={async (value : number | undefined)=>{
                        sendApiMessage({url:"/control/mixer/stop"});
                    }}
                ></ApiValueController>

                <ApiSlider 
                    target={{
                        getter: {url:"/control/heater/intensity", key:"intensity"}
                    }}
                    title="Heater" 
                    direction="H" 
                    bounds={{ min: -1, max: 1 }} 
                    deadzones={[
                        {range: 0.2, snapPoint: 0}
                    ]}
                    step={0.05}
                ></ApiSlider>

                <ApiValueController
                    title="Heater target temperature"
                    valueName="current target"
                    buttonTooltip="turn off the heater"
                    buttonText="turn off"
                    min={0}
                    max={60}
                    unit="°C"
                    getter={{url:"/control/heater/target_temperature",key:"temperature"}}
                    onClick={async (value : number | undefined)=>{
                        sendApiMessage({url:"/control/heater/turn_off"});
                    }}
                    getValueFunction={async ()=>((await Sensor_Heater.sendGetTarget()).targetTemp)}
                ></ApiValueController>
            </div>
        </Widget>
    )
}

export function  Control(props : ControlProps){
    return (
        <GridElement id={props.id} w={1} h={5}>
            <RefreshProvider>
                <ControlBody
                ></ControlBody>
            </RefreshProvider>
        </GridElement>
    )
}
