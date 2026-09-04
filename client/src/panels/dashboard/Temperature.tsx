import { TableStatic, widgetHeightChange } from "../../../lib/web-components/Table/Table"
import { Widget, WidgetHotbarValue } from "../common/Widget"
import { GridElement } from "../../components/GridstackGrid/GridstackGrid"
import { createEffect, createSignal, createUniqueId, Show, type JSXElement } from "solid-js"
import { Icon } from "../../components/Icon/Icon"
import { type Icons } from "../../components/Icon/icons_chars"
import { ApiFetcher } from "../../components/ApiFetcher/ApiFetcher"
import { darkenColor, getColor } from "../../../lib/web-components/other/colorGenerator"
import { LineChart, type datasetType } from "../../components/LineChart/LineChart"
import { formatTime, getCountdownArray } from "../../../lib/web-components/other/utils"
import { moduleInstanceColors, type Module, type moduleInstancesType } from "../../../lib/common-types/Module";
import { RadialSelect } from "../../../lib/web-components/RadialSelect/RadialSelect"
import { RefreshProvider, refreshValueUpdate, useRefreshContext } from "../../../lib/web-components/other/RefreshProvider"
import { TemperatureLogs } from "../../../lib/api-messages/temperature-logs/_"
import styles from "./Temperature.module.css"
import { countInstancesOfType, getInstancesForType, useModuleListValue } from "../../components/other/ModuleListProvider"
// create subrows by setting icon as undefined
// row indexes are then given automatically after generating the array
type row = {
    lastSubRow?: boolean
    icon?: Icons,
    name: NameType,
    instance: moduleInstancesType,
    targetkey?: string
}


const endpointToName = {
    "/sensor/bottle/temperature" : "Bottle",
    "/sensor/bottle/top/measured_temperature" : "Bottle.Top",
    "/sensor/bottle/bottom/measured_temperature" : "Bottle.Bottom",
    "fluorometer":"Fluorometer",
    "/sensor/fluorometer/detector/temperature" : "Fluorometer.Detector",
    "/sensor/fluorometer/emitor/temperature" : "Fluorometer.Emitor",
    "/sensor/spectrophotometer/emitor/temperature" : "Spectrophotometer",
    "/control/led_panel/temperature" : "LED panel",
    "/control/heater/plate_temperature" : "Heater plate",
    "test":"Test"
}as const;

const nameToEndpoint = Object.fromEntries(
    Object.entries(endpointToName).map(([k, v]) => [v, k])
) as { [K in keyof typeof endpointToName as typeof endpointToName[K]]: K };

type NameType = keyof typeof nameToEndpoint;
type EndpointType = keyof typeof endpointToName;

function getEndpoint(name : string) : EndpointType | undefined{
    return (nameToEndpoint as Record<string,EndpointType>)[name];
}

function getName(endpoint : string) : NameType | undefined{
    return (endpointToName as Record<string,NameType>)[endpoint];
}

function generateTimeLabels(currentTime : number, count : number, scope : "M"|"D"|"H") {
    const labels = [];
    const step : number = {
        "M":    1000,
        "H":   60000,
        "D": 3600000,
    }[scope];

    for (let i = 0; i < count; i++) {
        const timePoint = new Date(currentTime - (count - 1 - i) * step);
        
        const timeString = formatTime({
            "M":"HH:MM:SS",
            "H":"HH:MM",
            "D":"dd.mo HHh"
        }[scope],timePoint)
        
        labels.push(timeString);
    }

    return labels;
}


interface TemperatureProps{
    id: string;
}

interface TemperatureBodyProps extends TemperatureProps{
    rowNumberSetter : (value : number) => void;
}

export function TemperatureBody(props : TemperatureBodyProps) {
    let i=0;
    const [rows, setRows] = createSignal<row[]>([]);
    const [scope, setScope] = createSignal<"M"|"D"|"H">("M");
    const [labels, setLabels] = createSignal<string[]>([])
    const [datasets, setDatasets] = createSignal<TemperatureLogs.Logs>({})
    const [hiddenDatasets, setHiddenDatasets] = createSignal<Record<NameType,boolean | undefined>>({
        Bottle: false,
        "Bottle.Top": true,
        "Bottle.Bottom": true,
        Fluorometer: true,
        "Fluorometer.Detector": true,
        "Fluorometer.Emitor": true,
        Spectrophotometer: true,
        "LED panel": true,
        "Heater plate": true,
        Test: undefined
    });
    const [colors, setColors] = createSignal<Record<NameType,string | undefined>>({
        Bottle: undefined,
        "Bottle.Top": undefined,
        "Bottle.Bottom": undefined,
        Fluorometer: undefined,
        "Fluorometer.Detector": undefined,
        "Fluorometer.Emitor": undefined,
        Spectrophotometer: undefined,
        "LED panel": undefined,
        "Heater plate": undefined,
        Test: undefined
    });

    const moduleListCntxt = useModuleListValue();
    const scopeGroupName = createUniqueId()
    const refreshCntxt = useRefreshContext();
    const historyLen = 80;
    let lastRefresh = 0;
    let lastScope = ""

    function toggleDatasetVisibility(name : NameType){
        setHiddenDatasets(prev => ({
            ...prev,
            [name]: !(prev[name] ?? false)
        }));
    }

    function renderRow(data: row, index:number) : JSXElement[] {
        function isActive(name : NameType){
            return  colors()[data.name] !== undefined && nameToEndpoint[data.name].at(0) === "/";
        }
        return [
            <button 
                classList={{
                    [styles.icon_button]: true,
                    [styles.hidden]: hiddenDatasets()[data.name] ?? false,
                    [styles.active] : isActive(data.name)
                }}
                onclick={()=>{
                    if(isActive(data.name)){
                        toggleDatasetVisibility(data.name);
                    }
                }}
                style={{
                    color: colors()[data.name]
                }}
            >
                <Show when={data.icon} fallback={
                    <p class={styles.sub_sensor}>{
                        (data.lastSubRow ?? false) ? (
                            "┗"
                        ):(
                            "┣"
                        )
                    }</p>
                }>
                    <Icon 
                        color={
                            colors()[data.name]
                        } 
                        name={data.icon ?? "error"}
                        animateColor={true}
                    ></Icon>
                </Show>
                
            </button>,
            <p style={{
                "justify-content":"start",
                "border-left": (data.instance != "Exclusive")?`3px solid ${moduleInstanceColors[data.instance]}`:undefined,
                "padding-left": (data.instance != "Exclusive")?"5px":undefined
            }}>{data.name}</p>,

            (nameToEndpoint[data.name].at(0) == "/")?(
                <ApiFetcher 
                    target={{
                        url: nameToEndpoint[data.name],
                        key: data.targetkey ?? "temperature"
                    }} 
                    unit="°C" 
                    numberOnly={{
                        decimalPlaces: 2
                    }}
                    minInterval={5000}
                ></ApiFetcher>
            ):(
                <p></p>
            )
        ]
    }

    function refreshRows(moduleList: Module[]) {
        if (moduleListCntxt) {
            let result: row[] = [];

            if (countInstancesOfType(moduleList, "sensor", "Exclusive") > 0) {
                result.push(
                    {
                        icon:       "water_full", 
                        name:       "Bottle",
                        instance:   "Exclusive"
                    },{
                        icon:       undefined, 
                        name:       "Bottle.Top",
                        instance:   "Exclusive"
                    },{
                        icon:       undefined, 
                        name:       "Bottle.Bottom",
                        instance:   "Exclusive",
                        lastSubRow: true
                    },{
                        icon:       "water_lux", 
                        name:       "Fluorometer",
                        instance:   "Exclusive"
                    },{
                        icon:       undefined,
                        name:       "Fluorometer.Detector",
                        instance:   "Exclusive"
                    },{
                        icon:       undefined, 
                        name:       "Fluorometer.Emitor",
                        instance:   "Exclusive",
                        lastSubRow: true
                    },{
                        icon:       "wb_incandescent", 
                        name:       "Spectrophotometer",
                        instance:   "Exclusive"
                    },{
                        icon:       "wb_twilight",
                        name:       "LED panel",
                        instance:   "Exclusive"
                    },
                )
            }

            if(countInstancesOfType(moduleList, "control","Exclusive")>0){
                result.push(
                    {
                        icon:       "mode_heat", 
                        name:       "Heater plate", 
                        instance:   "Exclusive"
                    }
                )
            }

            for (let instance of getInstancesForType(moduleList, "pump")) {
                /*
                #TODO this code is an example of an instanced module temperature
                result.push({
                    icon: "water_full",
                    name: "Test",
                    instance: instance
                })
                */
            }

            setRows(result);
        }
    }

    createEffect(()=>{
        if(moduleListCntxt){
            refreshRows(moduleListCntxt.state())
        }
    })

    if(moduleListCntxt){
        refreshRows(moduleListCntxt.state())
    }

    function parseDatasets(datasets : TemperatureLogs.Logs, hiddenDatabase : Record<NameType,boolean|undefined>) : datasetType[]{
        let result : datasetType[] = [];
        let newColors : Record<NameType,string | undefined> = {
            Bottle: undefined,
            "Bottle.Top": undefined,
            "Bottle.Bottom": undefined,
            Fluorometer: undefined,
            "Fluorometer.Detector": undefined,
            "Fluorometer.Emitor": undefined,
            Spectrophotometer: undefined,
            "LED panel": undefined,
            "Heater plate": undefined,
            Test: undefined
        };
        let subIndexes : Record<string, number> = {}
        let currIndex = 0;

        function getNameColor(name : NameType) : string{
            const existingEntry = newColors[name];
            if(existingEntry!==undefined){
                return existingEntry;
            }

            const split = name.split(".");
            if(split.length==1){
                const newColor = getColor(currIndex++);
                newColors[name] = newColor;
                return newColor;
            }else{
                const parent = split[0] as NameType;

                let parentColor = newColors[parent];
                if(parentColor === undefined){
                    parentColor = getNameColor(parent);
                }

                let subIndex = subIndexes[parent];
                if(subIndex !== undefined){
                    subIndexes[parent]+=1;
                }else{
                    subIndexes[parent]=3;
                }
                const resultColor = darkenColor(parentColor,subIndex ?? 2);
                newColors[name] = resultColor;
                return resultColor;
            }
        }

        for(let endpoint in datasets){
            if(datasets[endpoint]){
                let name = getName(endpoint);
                let color = (name!==undefined)?(getNameColor(name)):("#cccccc");
                result.push({
                    label: name ?? endpoint,
                    data: datasets[endpoint],
                    hidden: (name!==undefined)?(hiddenDatabase[name]):(false),
                    borderColor: color,
                    backgroundColor: darkenColor(color,2)
                })
            }
        }

        setColors(newColors);
        return result;
    }

    function getEmptyArray(size : number) : undefined[]{
        let arr : undefined[]= []
        arr.length = size;
        return arr;
    }

    function addLogsToChart(logs: TemperatureLogs.Logs){
        let newDatasets : TemperatureLogs.Logs = {}
        let oldDatasets = datasets();

        for(let endpoint in logs){
            if(logs[endpoint]){
                let newData = logs[endpoint];
                let oldData : (number|undefined)[] = getEmptyArray(historyLen);
    
                if(oldDatasets[endpoint]){
                    oldData = oldDatasets[endpoint]
                }
    
                newDatasets[endpoint]=[...oldData.slice(newData.length),...newData];
            }
        }

        setDatasets(newDatasets)
    }

    createEffect(()=>{
        props.rowNumberSetter(rows().length)
    })
    createEffect(async ()=>{
        if(!refreshValueUpdate(refreshCntxt?.listen()) && lastScope == scope()){
            return;
        }
        if(lastScope != scope()){
            lastRefresh = 0;
            setLabels(generateTimeLabels(Date.now(),historyLen,scope()));
            lastScope = scope();
            setDatasets({});
        }
        let scopeForThisFetch = scope();
        let result = await TemperatureLogs.sendGetLogs({
            fromCycle: lastRefresh,
            scope: scopeForThisFetch
        })
        if(result.logCount > 0 && scopeForThisFetch == scope()){
            lastRefresh = result.toCycle;
            addLogsToChart(result.logs);
            setLabels(generateTimeLabels(Date.now(),historyLen,scope()));
        }
    })

    return (
            <Widget
                name="Temperature"
                customRefreshProvider={true}
            >
                <TableStatic 
                    renderRow={renderRow} 
                    data={rows()} 
                    headers={["color", "name", "current"]} 
                    colSizes={["40px",undefined,"60px"]}
                ></TableStatic>
                <RadialSelect
                    groupName={scopeGroupName}
                    selections={[
                        {value:"M",label:"minute"},
                        {value:"H",label:"hour"},
                        {value:"D",label:"day"}
                    ]}
                    getter={scope}
                    setter={setScope}
                ></RadialSelect>
                <div style={{flex:"1 1 auto", "min-height": 0}}>
                    <LineChart 
                        labels={labels()} 
                        datasets={parseDatasets(datasets(),hiddenDatasets())}
                        options={{
                            x:{
                                showTicks: true
                            },
                            raw:{
                            scales:{
                                x:{
                                    type: 'category',
                                    ticks: {
                                        autoSkip: true,
                                    },
                                    grid:{
                                        color: "rgb(50,50,50)"
                                    }
                                },
                                y:{
                                    grid:{
                                        color: "rgb(50,50,50)"
                                    },
                                    suggestedMax: 40,
                                    suggestedMin: 10
                                }
                            }
                        }}}
                    ></LineChart>
                </div>
                
            </Widget>
    )
}

export function Temperature(props: TemperatureProps) {
    const [rows, setRows] = createSignal(0);
    return (
        <GridElement id={props.id} w={1} h={widgetHeightChange(rows())+3}>
            <RefreshProvider autoRefreshPeriod={1500}>
                <TemperatureBody 
                    rowNumberSetter={setRows}
                    {...props}
                ></TemperatureBody>
            </RefreshProvider> 
        </GridElement>
    )
}
