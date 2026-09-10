import { createEffect, createSignal, For, onMount, Show, type JSXElement } from "solid-js";
import { Button } from "../../../lib/web-components/Button/Button";
import { GridElement } from "../../components/GridstackGrid/GridstackGrid";
import { LineChart, type CustomChartOptions } from "../../components/LineChart/LineChart";
import { downloadCanvas, downloadStringAsFile } from "../../../lib/web-components/other/utils";
import { Widget } from "../common/Widget";

import styles from  "./KineticFluorometer.module.css"
import { SliderSimple } from "../../../lib/web-components/Slider/Slider";
import { RadialSelect } from "../../../lib/web-components/RadialSelect/RadialSelect";

import { createUniqueId } from "solid-js";
import { enforceMax, enforceMin, enforceMinMax } from "../../../lib/web-components/other/inputFilters";
import { Icon } from "../../components/Icon/Icon";
import { RefreshProvider, refreshValueUpdate, useRefreshContext } from "../../../lib/web-components/other/RefreshProvider";
import { Sensor_Fluorometer } from "../../../lib/api-messages/sensor/fluorometer";
import { ValueDisplay } from "../../../lib/web-components/ValueDisplay/ValueDisplay";
import type { TooltipItem } from "chart.js";
import { sendApiMessageSimple } from "../../../lib/api-messages/apiMessageSimple";
import { LoadingDots } from "../../../lib/web-components/LoadingDots/loadingDots";
import { reactorApiTarget } from "../../../lib/api-messages/apiMessageConfig";

type statRow = {
    name: string;
    value:  string | number | undefined | JSXElement;
}
interface InputElementProps{
    unit : string;
    setter : (value : number) => void;
    getter : () => number;
    min : number;
    max : number;
}

function InputElement(props :InputElementProps){ //#TODO make it a fully usable component
    return (
        <div class={styles.input_container}>
            <input
                class={"button"}
                type="text"
                onInput={e => {
                    e.currentTarget.value = enforceMax(e.currentTarget.value,props.max);
                }}
                onChange={e => {
                    e.currentTarget.value = enforceMin(e.currentTarget.value,props.min);
                    props.setter(+e.currentTarget.value)
                }}
                value={props.getter()}
            ></input>
            <p class={styles.input_unit}>
                {props.unit}
            </p>
        </div>
    )
}

function renderStats(measurement : Sensor_Fluorometer.Measurement) : statRow[]{
    return [
        {
            name: "measurement id",
            value: <ValueDisplay value={measurement.measurement_id.toString()}></ValueDisplay>
        }, {
            name: "timestamp",
            value: <ValueDisplay value={measurement.timestamp.toString()}></ValueDisplay>
        }, {
            name: "read", 
            value: <ValueDisplay value={measurement.read.toString()}></ValueDisplay>
        }, {
            name: "saturated",
            value: <ValueDisplay value={measurement.saturated.toString()}></ValueDisplay>
        }, {
            name: "detector_gain",
            value: <ValueDisplay value={measurement.detector_gain.toString()}></ValueDisplay>
        },{
            name: "intensity",
            value: <ValueDisplay value={(measurement.intensity*100).toString()} numberOnly={{decimalPlaces: 0}} unit="%"></ValueDisplay>
        }, {
            name: "timebase",
            value: <ValueDisplay value={measurement.timebase.toString()}></ValueDisplay>
        }, {
            name: "length_ms",
            value: <ValueDisplay value={measurement.length_ms.toString()} unit="ms"></ValueDisplay>
        }, {
            name: "required_samples",
            value: <ValueDisplay value={measurement.required_samples.toString()}></ValueDisplay>
        }, {
            name: "captured_samples",
            value: <ValueDisplay value={measurement.captured_samples.toString()}></ValueDisplay>
        }, {
            name: "missing_samples",
            value: <ValueDisplay value={measurement.missing_samples.toString()}></ValueDisplay>
        }
    ]
}

type ChartData = {
    lables: number[],
    datasets : {
        data: number[],
        label: string,
        hidden?: boolean,
    }[],
    xBounds: {
        min: number
        max: number
    }
}

function parseSamples(samples: Sensor_Fluorometer.Sample[]) : ChartData{

    if(samples.length == 0){
        return {
            lables: [],
            datasets: [],
            xBounds:{
                min:0,
                max:1
            }
        }
    }

    let labels: number[] = [];
    let relativeValues : number[] = [];
    let absoluteValues : number[] = [];
    let rawValues : number[] = [];


    for(let i=0;i<samples.length;i++){
        labels.push(Math.round(samples[i].time_ms*1000));
        relativeValues.push(samples[i].relative_value);
        absoluteValues.push(samples[i].absolute_value);
        rawValues.push(samples[i].raw_value);
    }

    return {
        lables: labels,
        datasets: [{
            data: relativeValues,
            label: "relative"
        },{
            data: absoluteValues,
            label: "absolute"
        },{
            data: rawValues,
            label: "raw",
            hidden: true,
        }],
        xBounds:{
            min:labels[0],
            max:labels[samples.length-1]
        }
    }
}


interface KinematicFluorometerProps{
    id: string;
}

export function KinematicFluorometerBody(props: KinematicFluorometerProps){
    
    const [stats, setStats] = createSignal<statRow[]>([]);
    
    const [length,setLength] = createSignal<number>(1);
    const [intensity,setIntensity] = createSignal<number>(100);
    const [gain, setGain] = createSignal<Sensor_Fluorometer.detectorGainsType>("x1");

    const [chartData, setChartData] = createSignal<ChartData>(parseSamples([]))
    const [chartOpts, setChartOpts] = createSignal<CustomChartOptions>(getChartOpts(chartData()));
    const [currentMeasurement, setCurrentMeasurement] = createSignal<Sensor_Fluorometer.Measurement | undefined>();
    const [popupMessage, setPopupMessage] = createSignal<string | undefined>("no data");
    const [popupMessageLoading, setPopupMessageLoading] = createSignal<boolean>(false);
    
    let chartMethods : { getCanvas: () => HTMLCanvasElement | undefined } | undefined;
    let lastMeasurementId = -1;
    
    const gainGroupName = createUniqueId();
    const refreshValue = useRefreshContext();

    async function getFileName() : Promise<string | undefined>{
        let measurement = currentMeasurement();

        if(measurement){
            let filename = 'OJIP_';
            try { 
                filename+= (await sendApiMessageSimple({url:"/core/hostname",key:"hostname",target:reactorApiTarget})).toString() + "_";
                filename+= (await sendApiMessageSimple({url:"/core/sid",key:"sid",target:reactorApiTarget})).toString() + "_";
            } catch (error) {
                filename = 'OJIP_unknownDevice_';
            }
            filename+= measurement.measurement_id + "_";

            filename+= measurement.timestamp.replace(/[:.]/g, '-'); //ISO 8601
            return filename;
        }
        
        throw Error("no measurement loaded")
    }
    
    function renderMeasurement(measurement ?: Sensor_Fluorometer.Measurement){
        if(measurement != undefined){
            if(lastMeasurementId == measurement.measurement_id){
                return
            }
            
            lastMeasurementId = measurement.measurement_id;
            setPopupMessageLoading(false);
            setPopupMessage(undefined);
            try {
                Sensor_Fluorometer.fillCorrectedTimestamp(measurement);
            } catch (error) {
                
            }
            setCurrentMeasurement(measurement)
            setStats(renderStats(measurement))
            setChartData(parseSamples(measurement.samples))
        }else{
            lastMeasurementId = -1;
            setPopupMessageLoading(false);
            setPopupMessage("no measurement loaded");
            setCurrentMeasurement(undefined);
            setStats([]);
            setChartData(parseSamples([]));
        }
    }
    
    let lastUpdate = 0;
    createEffect(async () => {
        if(!refreshValueUpdate(refreshValue?.listen(),{length:5000,lastUpdate:lastUpdate})){
            return
        }
        lastUpdate = Date.now();
        
        let response = await Sensor_Fluorometer.sendReadLast();
        renderMeasurement(response.measurement);
    })

    createEffect(()=>{
        console.log("reloading options for chart: ",getChartOpts(chartData()))
        setChartOpts(getChartOpts(chartData()))
    })
    
    async function doCapture(){
        renderMeasurement();
        setPopupMessage("capturing");
        setPopupMessageLoading(true);
        try {
            let response = await Sensor_Fluorometer.sendCapture({
                detectorGain: gain(),
                emitorIntensity: intensity()/100,
                lengthMs: length()*1000,
                timebase: "logarithmic",
                sampleCount: 1000
            });
            
            renderMeasurement(response.measurement);
            return true;
        } catch (error) {
            //make sure that the popup stays there at least for 1 second
            setTimeout(()=>{
                lastMeasurementId = -1;
            },1000);
            setPopupMessage("error occured");
            setPopupMessageLoading(false);
            return false;
        }
    }

    function getChartOpts(data : ChartData): CustomChartOptions {
        return {
            plugins: {
                legend: { position: "bottom", show: true },
                zoom: {
                    min: data.xBounds.min,
                    max: data.xBounds.max,
                    mode: "x",
                    pan: "x"
                },
                tooltip: {
                    titleCallback: (items: TooltipItem<any>[]) => {
                        if (items.length > 0) {
                            return items[0].label + " µs";
                        }
                        return ""
                    }
                }
            },
            y: {
                bounds: {
                    min: 0,
                    max: 1
                }
            },
            x: {
                type: "logarithmic",
                bounds: data.xBounds,
                labelCallback: function (value) {
                    value = Math.round(value);
                    var out = value + 'µs';
                    if (value >= 1000) {
                        out = (value / 1000) + 'ms';
                    }
                    if (value >= 1000000) {
                        out = (value / 1000000) + 's';
                    }
                    return out;
                },
            }
        }
    }
    

    return (
            <Widget 
                name="Kinematic fluorometer"
                customRefreshProvider={true}
                hotbarTargets={() => (
                        <>
                            <Button 
                                callback={async () => {
                                    await Sensor_Fluorometer.sendCalibrate();
                                    return true;
                                }} 
                                tooltip="Calibrate the Kinetic fluorometer"
                            >
                                <p>calibrate</p>
                            </Button>
                            <Button 
                                disabled={currentMeasurement() === undefined}
                                callback={async () => {
                                    let filename= await getFileName() + ".png";
                                    if(chartMethods){
                                        let canvas = chartMethods.getCanvas();
                                        if(canvas){
                                            downloadCanvas(canvas,filename);
                                        }
                                    }
                                    return true
                                }}
                                tooltip="download current capture chart as an image"
                                disabledTooltip="no data loaded"
                            >
                                <Icon scale={1.4} name="image_arrow_up"></Icon>
                            </Button>
                            <Button 
                                disabled={currentMeasurement() === undefined}
                                callback={async () => {
                                    let measurement = currentMeasurement();
                                    if(measurement) {
                                        let filename= await getFileName() + ".json";
                                        downloadStringAsFile(JSON.stringify(measurement, null, 2),filename);
                                    }
                                    return true;
                                }}
                                tooltip="download current capture data as json"
                                disabledTooltip="no data loaded"
                            >
                                <Icon scale={1.4} name="upload_file"></Icon>
                            </Button>
                        </>
                    )
                }
            
            >
                <div  class={styles.chart}>
                    <LineChart 
                        labels={chartData().lables}
                        datasets={chartData().datasets}
                        options={chartOpts()}
                        ref={(methods) => chartMethods = methods}
                    ></LineChart>
                    <p class={styles.chart_comment}>use [shift] + scroll wheel to zoom</p>
                    <div classList={{[styles.chart_popup]:true,[styles.hidden]:(popupMessage() == undefined)}}>
                        <p>{popupMessage()}
                            <Show when={popupMessageLoading()}>
                                <LoadingDots></LoadingDots>
                            </Show>
                        </p>
                    </div>
                </div>
                <div class={styles.panel}>
                    <div class={styles.stats_panel}>
                        <h2>current capture</h2>
                        <div class={styles.stats_container}>
                            <For each={stats()}>
                                {(row,index)=>(
                                    <div class={styles.stats_row}><p>{row.name}</p><p>{row.value}</p></div>
                                )}
                            </For>
                        </div>
                    </div>
                    <div class={styles.control_panel}>
                        <h2>New capture</h2>
                        <div class={styles.control_container}>
                            <div class={styles.controls}>
                                <div>
                                    <p>Length: </p>
                                    <SliderSimple 
                                        direction="H"
                                        bounds={{min:0.2,max:4}}
                                        setter={setLength}
                                        getter={length}
                                        step={0.1}
                                    ></SliderSimple>
                                    <InputElement
                                        unit="s"
                                        setter={setLength}
                                        getter={length}
                                        min={2}
                                        max={4}
                                    ></InputElement>
                                </div>
                                <div>
                                    <p>Intensity: </p>
                                    <SliderSimple 
                                        direction="H"
                                        bounds={{min:20,max:100}}
                                        setter={setIntensity}
                                        getter={intensity}
                                    ></SliderSimple>
                                    <InputElement
                                        unit="%"
                                        setter={setIntensity}
                                        getter={intensity}
                                        min={20}
                                        max={100}
                                    ></InputElement>
                                </div>
                                <div>
                                    <p>Gain: </p>
                                    <div>
                                        <RadialSelect
                                            groupName={gainGroupName}
                                            selections={[
                                                {value:"x1",label:"1"},
                                                {value:"x10",label:"10"},
                                                {value:"x50",label:"50"}
                                            ]}
                                            getter={gain}
                                            setter={setGain}
                                        ></RadialSelect>
                                    </div>
                                </div>
                            </div>
                            <Button 
                                class={styles.begin_button} 
                                callback={doCapture}
                                tooltip="starts a capture, this action can take some time"
                            >
                                begin capture
                            </Button>
                        </div>
                    </div>
                </div>
            </Widget>
    )
}

export function KinematicFluorometer(props: KinematicFluorometerProps){
    return(
        <GridElement id={props.id} w={2} h={8}>
            <RefreshProvider>
                <KinematicFluorometerBody {...props}
                ></KinematicFluorometerBody>
            </RefreshProvider>
        </GridElement>
    )
}
