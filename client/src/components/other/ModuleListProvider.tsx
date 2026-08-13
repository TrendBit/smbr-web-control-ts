import { createContext, useContext, createSignal, createEffect, onMount, onCleanup, children } from "solid-js";
import { refreshValueUpdate, useRefreshContext } from "../../common/web-components/other/RefreshProvider";
import { System } from "../../apiMessages/system/_";

export const moduleTypes = [
  "core",
  "sensor",
  "pump",
  "control",
  "undefined"
] as const;

export const moduleInstances  = [
  "Undefined",
  "Exclusive",
  "All",
  "Reserved",
  "Instance_1",
  "Instance_2",
  "Instance_3",
  "Instance_4",
  "Instance_5",
  "Instance_6",
  "Instance_7",
  "Instance_8",
  "Instance_9",
  "Instance_10",
  "Instance_11",
  "Instance_12"
] as const;

export const moduleInstanceColors = {
  "Undefined"   : "rgb( 255 , 0 , 0 )",
  "Exclusive"   : "rgb(255, 255, 255)",
  "All"         : "rgb(255, 255, 255)",
  "Reserved"    : "rgb(255, 255, 255)",
  "Instance_1"  : "rgb( 255 , 115 , 0 )",
  "Instance_2"  : "rgb( 255 , 255 , 0 )",
  "Instance_3"  : "rgb( 9 , 255 , 0 )",
  "Instance_4"  : "rgb( 0 , 213 , 255 )",
  "Instance_5"  : "rgb( 68 , 0 , 255 )",
  "Instance_6"  : "rgb( 255 , 0 , 255 )",
  "Instance_7"  : "rgb( 255 , 226 , 140 )",
  "Instance_8"  : "rgb( 255 , 255 , 140 )",
  "Instance_9"  : "rgb( 147 , 255 , 140 )",
  "Instance_10" : "rgb( 140 , 255 , 255 )",
  "Instance_11" : "rgb( 140 , 191 , 255 )",
  "Instance_12" : "rgb( 255 , 140 , 255 )",
} as const;

export const instanceToIndex = {
  "Undefined"   : 0,
  "Exclusive"   : 0,
  "All"         : 0,
  "Reserved"    : 0,
  "Instance_1"  : 1,
  "Instance_2"  : 2,
  "Instance_3"  : 3,
  "Instance_4"  : 4,
  "Instance_5"  : 5,
  "Instance_6"  : 6,
  "Instance_7"  : 7,
  "Instance_8"  : 8,
  "Instance_9"  : 9,
  "Instance_10" : 10,
  "Instance_11" : 11,
  "Instance_12" : 12
} as const;

export type moduleTypesType = typeof moduleTypes[number]
export type moduleInstancesType = typeof moduleInstances[number]

export type Module = {
  readonly type: moduleTypesType;
  readonly instance: moduleInstancesType;
  readonly uid: string;
}

export type ModuleListContextValue = {
  state: () => Module[],
  actions: {
    setModuleList: (newList: Module[]) => void; //#TODO type control
  }
};

interface ModuleListProviderProps{
  children: any;
}
const ModuleListContext = createContext<ModuleListContextValue>();

export function ModuleListProvider(props : ModuleListProviderProps){
  const [moduleList, setModuleList] = createSignal<Module[]>([])

  createEffect(() => {
    console.log("module list changed to: ",moduleList());
  })

  return (
    <ModuleListContext.Provider value={{
      state: moduleList,
      actions:{
        "setModuleList": setModuleList
      }
    }}>
      {props.children}
    </ModuleListContext.Provider>
  )
}

export const useModuleListValue = () => useContext(ModuleListContext);

export function getInstancesForType(moduleList : Module[] | undefined,type : moduleTypesType, includeInvalid = false){
  if(!moduleList){
    return [];
  }
  let result : moduleInstancesType[] = []
  moduleList.forEach(element => {
    if(element.type == type){
      if ((
        element.instance != "Undefined"
        && element.instance != "Exclusive"
        && element.instance != "All"
        && element.instance != "Reserved")
        || includeInvalid
      ) {
        result.push(element.instance);
      }
    }
  });
  return result
}

export function getModulesOfType(moduleList : Module[] | undefined, type : moduleTypesType, includeInvalid = false){
  if(!moduleList){
    return [];
  }
  let result : Module[] = []
  moduleList.forEach(element => {
    if(element.type == type){
      if ((
        element.instance != "Undefined"
        && element.instance != "Exclusive"
        && element.instance != "All"
        && element.instance != "Reserved")
        || includeInvalid
      ) {
        result.push(element);
      }
    }
  });
  return result
}

export function countInstancesOfType(moduleList: Module[] | undefined, type: moduleTypesType, instance: moduleInstancesType){
  if(!moduleList){
    return 0;
  }
  let result : number = 0;
  moduleList.forEach(element => {
    if(element.type == type && element.instance == instance){
      result++;
    }
  });
  return result;
}



export function ModuleListRefresher(props: { enabled: boolean, children?: any, min_interval: number}) {
    const refreshCntx = useRefreshContext();
    const moduleListCntx = useModuleListValue();
    let lastUpdate = 0;
    createEffect(async () => {
        if (!props.enabled){
            return
        }
        if (!refreshValueUpdate(refreshCntx?.listen(), { length: props.min_interval, lastUpdate })) {
            return
        }
        if(!moduleListCntx){
            return
        }
        lastUpdate = Date.now();

        let response = await System.sendModules();
        let doUpdate = false;

        let lastRows = moduleListCntx.state()
        if (lastRows.length == response.modules.length) {
            for (let i = 0; i < lastRows.length; i++) {
                if (lastRows[i].uid != response.modules[i].uid) {
                    doUpdate = true;
                    break;
                }
            }
        } else {
            doUpdate = true;
        }
        if (doUpdate) {
            let newRows : Module[] = [];
            for(let module of response.modules){
                newRows.push({
                    type: module.type,
                    instance: module.instance,
                    uid: module.uid
                })
            }

            moduleListCntx.actions.setModuleList(newRows);
        }
    })

    return (
        <>{ children }</>
    )
}
