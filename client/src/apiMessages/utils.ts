import { instanceToIndex, type Module } from "../components/other/ModuleListProvider"
import type { System } from "./system/_"

export function getModuleEndpoint(module : Module, endpoint : string){
    switch (module.type) {
        case "pump":
            return `/pump/${endpoint}?instance=${instanceToIndex[module.instance]}`
        default:
            return `/${module.type}/${endpoint}`
    }
}
