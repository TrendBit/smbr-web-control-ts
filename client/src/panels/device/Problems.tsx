import { createEffect, createSignal, For, Show } from "solid-js"
import { GridElement } from "../../components/GridstackGrid/GridstackGrid"
import { Widget } from "../common/Widget"
import styles from "./Problems.module.css"
import { System } from "../../../lib/api-messages/system/_";
import { refreshValueUpdate, useRefreshContext } from "../../../lib/web-components/other/RefreshProvider";
import { ValueDisplay } from "../../../lib/web-components/ValueDisplay/ValueDisplay";

const problemTypes = [
    "Errors",
    "Warnings"
] as const;

type problemTypesType = typeof problemTypes[number];

const tabs = [
    "All",
    ...problemTypes
] as const;

type tabsType = typeof tabs[number];

interface ModuleProblemsBodyProps{
}

type problemStorageType = Record<problemTypesType,System.Problem[] | undefined>;
type errorsStorageType = Record<problemTypesType,boolean>;

function ModuleProblemsBody(props:ModuleProblemsBodyProps){
    const [problems, setProblems] = createSignal<problemStorageType>({
        Warnings: undefined,
        Errors: undefined
    })
    const [errorsOccured, setErrorsOccured] = createSignal<errorsStorageType>({
        Warnings: false,
        Errors: false
    })
    const [currentTab, setCurrentTab] = createSignal<tabsType>("All");


    const refreshCntxt = useRefreshContext();
    createEffect(async ()=>{
        if(!refreshValueUpdate(refreshCntxt?.listen())){
            return
        }
        let newProblems : problemStorageType = {
            Warnings: undefined,
            Errors: undefined
        }
        let newErrors : errorsStorageType = {
            Warnings: false,
            Errors: false
        }
        let apiCalls : Promise<void>[] = []
        for(let key of problemTypes){
            apiCalls.push((async () =>{
                try {
                     let response : System.problemResult;
                        switch(key){
                        case "Errors":
                            response = await System.sendErrors();
                            break;
                        case "Warnings":
                            response = await System.sendWarnings();
                            break;
                    }
                    newProblems[key] = response.problems;
                } catch (error) {
                    newErrors[key] = true;
                    newProblems[key] = undefined;
                }
                
            })());
        }
        
        await Promise.allSettled(apiCalls);

        setProblems(newProblems);
        setErrorsOccured(newErrors);
    })



    function getProblemCount(tab : tabsType, problems: problemStorageType) : number | undefined{
        switch (tab){
            case "All":
                let sum = 0;
                for(let key of problemTypes){
                    let cache = problems[key];
                    if(cache){
                        sum+=cache.length
                    }
                }
                return sum
            default:
                return problems[tab as problemTypesType]?.length
        }
    }

    function getProblems(tab : tabsType, problems: problemStorageType) 
    : undefined | {type: problemTypesType, problem: System.Problem}[]{
        switch (tab){
            case "All":
                let result : {type: problemTypesType, problem: System.Problem}[] = []
                for(let key of problemTypes){
                    let cache = problems[key];
                    if(cache){
                            result = result.concat(
                                cache.map((el)=>({
                                    type: key,
                                    problem: el
                            }))
                        )
                    }
                }
                return result;
            default:
                let cache = problems[tab as problemTypesType];
                return cache?.map((el)=>(
                    {
                        type: tab as problemTypesType,
                        problem: el
                    }
                ))
        }
    }

    return (
        <>
            <div class={styles.container}>
                <div class={styles.header}>
                    <For each={tabs}>
                        {(el,index) => (
                            <button 
                                classList={{
                                    [styles.tab]: true,
                                    ["button"]: true,
                                    [styles.active]: currentTab() == tabs[index()],
                                    [styles.warning]: el === "Warnings",
                                    [styles.error]: el === "Errors"
                                }}
                                onclick={()=>{
                                    setCurrentTab(el)
                                }}
                            >
                                <p>{el}</p>
                                <ValueDisplay
                                    value={getProblemCount(el,problems())?.toString()}
                                    error={(el !== "All")?errorsOccured()[el as problemTypesType]:undefined}
                                ></ValueDisplay>
                            </button>
                        )}
                    </For>
                </div>
                <div class={styles.body}>
                    <Show when={(currentTab() !== "All")?!errorsOccured()[currentTab() as problemTypesType]:true}
                        fallback={
                            <p class={styles.error_message}>Errors occured</p>
                        }
                    >
                        <For each={getProblems(currentTab(),problems())}>
                            {(el,index)=>(
                                <div classList={{
                                    [styles.problem]: true,
                                    [styles.warning]: el.type === "Warnings",
                                    [styles.error]: el.type === "Errors"
                                }}>
                                    <div class={styles.problem_header}>
                                        <p class={styles.type}>{el.problem.type}</p>
                                        <p class={styles.id}>{el.problem.id}</p>
                                    </div>
                                    <p class={styles.message}>{el.problem.message}</p>
                                    <p class={styles.detail}>{el.problem.detail}</p>
                                </div>
                            )}
                        </For>
                    </Show>
                </div>
            </div>
        </>
    )
}


interface ModuleProblemsProps{
    id:string
}

export function ModuleProblems(props:ModuleProblemsProps){
    
    return (
        <GridElement id={props.id} w={1} h={4}>
            <Widget name="Module problems">
                <ModuleProblemsBody></ModuleProblemsBody>
            </Widget>
        </GridElement>
    )
}
