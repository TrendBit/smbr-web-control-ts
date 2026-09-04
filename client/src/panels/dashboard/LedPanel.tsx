import { GridElement } from "../../components/GridstackGrid/GridstackGrid"
import { ApiSlider } from "../../components/ApiSlider/ApiSlider";
import { Widget } from "../common/Widget";

import styles from "./LedPanel.module.css"
import { Button } from "../../../lib/web-components/Button/Button";
import { sendJsonApiMessage } from "../../../lib/api-messages/apiMessageBase";
import { For } from "solid-js";

interface LEDPanelProps{
    id: string;
}

export function LEDPanel(props: LEDPanelProps){
    const channels = [
        0,
        1,
        2,
        3
    ]
    return (
        <GridElement id={props.id} w={1} h={3}>
            <Widget 
                name="LED panel"
                hotbarTargets={()=>(
                    <>
                        <Button 
                            callback={async ()=>{
                                await sendJsonApiMessage({
                                    url: "/control/led_panel/intensity",
                                    method: "POST",
                                    data: "{\"intensity\": [0,0,0,0]}"
                                })
                                return true;
                            }}
                            tooltip="Set all LED channels to 0%"
                        >disable</Button>
                    </>
                )}
            >
                <div class={styles.container}>
                    <For each={channels}>
                        {(el,index)=>(
                            <ApiSlider
                                class={styles.slider}
                                direction="V"
                                title={"Channel " + el}
                                bounds={{ min: 0, max: 1, show: false }}
                                step={0.01}
                                minInterval={100}
                                unit="%"
                                displayModifier={value=>(Math.round(value*100))}

                                decimals={0}
                                
                                target={{
                                    getter:{url:"/control/led_panel/intensity/"+el,key:"intensity"},
                                    setter:{url:"/control/led_panel/intensity/"+el,key:"intensity"}
                                }}
                            ></ApiSlider>
                        )}
                    </For>
                </div>
            </Widget>
        </GridElement>
    )
}
