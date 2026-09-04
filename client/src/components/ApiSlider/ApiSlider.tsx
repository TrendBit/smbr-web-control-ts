import { createEffect, createSignal } from "solid-js"
import { sendApiMessageSimple, sendApiMessageSimplePost, type apiMessageSimple } from "../../../lib/api-messages/apiMessageSimple"
import { refreshValueUpdate, useRefreshContext } from "../../../lib/web-components/other/RefreshProvider"
import { Slider } from "../../../lib/web-components/Slider/Slider"

interface SliderApiControlProps{
    title: string,
    direction: "H"|"V"
    target:{
        getter: apiMessageSimple
        setter?: apiMessageSimple
    }
    class?:string,
    bounds : {
        min : number,
        max : number,
        show? : boolean
    },
    deadzones?: {
        snapPoint: number,
        range: number
    }[]
    decimals?:number,
    step?:number,
    unit?:string,
    minInterval?:number,
    imidiateStops?:number[]
    displayModifier? : (value : number)=>number
}

export function ApiSlider(props : SliderApiControlProps){
    const [value,setValue] = createSignal<number>(0);
    const refreshCntx = useRefreshContext()

    let currentState : "setting" | "idle" = "idle"
    let lastChange = 0;

    createEffect(async ()=>{
        if(!refreshValueUpdate(refreshCntx?.listen())){
            return
        }
        if(currentState==="idle"){
            let response = await sendApiMessageSimple(props.target.getter);
    
            setValue(+response);
        }
    })

    async function sendValue(value : number){
        await sendApiMessageSimplePost(props.target.setter ?? props.target.getter,value);
    }

    function onInput(value : number){
        setValue(value);
        let doSend = false;

        if(Date.now() > (props.minInterval??100)+lastChange){
            lastChange = Date.now();
            doSend = true;
        } else {
            for (let deadzone of props.deadzones ?? []) {
                if (deadzone.snapPoint == value) {
                    doSend = true;
                }
            }
            if((props.imidiateStops??[props.bounds.min,props.bounds.max]).includes(value)){
                doSend = true;
            }
        }
        if (doSend) {
            sendValue(value);
        }
    }
    function onChange(value : number){
        sendValue(value)
    }

    return (
        <Slider
            title={props.title}
            direction={props.direction}
            class={props.class}
            bounds={props.bounds}
            step={props.step}
            unit={props.unit}
            displayModifier={props.displayModifier}
            getter={value}
            setter={setValue}

            decimals={props.decimals}
            deadzones={props.deadzones}

            onChange={onChange}
            onInput={onInput}
        ></Slider>
    )
}
