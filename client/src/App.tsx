import { createEffect, createSignal, For, Show, type Accessor, type JSXElement } from 'solid-js'
import './common/web-components/css/colors.css'
import './common/web-components/css/global.css'
import "./components/Icon/iconFont.css"
import styles from './App.module.css'

import { Icon } from './components/Icon/Icon'
import { type Icons } from './components/Icon/icons_chars'
import { Public } from './assets/PublicFiles'

import { Dashboard } from './panels/dashboard/Dashboard'
import { Scripts } from './panels/scripts/Scripts'
import { Config } from './panels/config/Config'
import { Device } from './panels/device/Device'
import { Hotbar } from './panels/hotbar/Hotbar'
import { RefreshProvider, refreshValueUpdate, useRefreshContext } from './common/web-components/other/RefreshProvider'
import { isDebug } from './components/debug/debugFlag'
import { DebugApiMessageHostnameEditor, DebugModuleEditor, DebugRefreshProviderInterval } from './components/debug/Debug'
import { ModuleListProvider, ModuleListRefresher } from './components/other/ModuleListProvider'
import { AutoScrollerP } from './common/web-components/AutoScroller/AutoScroller'
import { ValueDisplay } from './common/web-components/ValueDisplay/ValueDisplay'
import { System } from './apiMessages/system/_'

type ItemProps = { text: string; iconName: Icons, active: Accessor<string>, onClick?: ()=>void};

function Item({ text, iconName,onClick,active}: ItemProps) {
   return (
      <li>
         <button class={`${styles.item} ${(active() === text)?styles.active:''}`} onClick={onClick}>
            <div class={styles.icon}>
               <Icon name={iconName}/>
            </div>
            <div class={styles.text}>
               <p>{text}</p>
            </div>
         </button>
      </li>
   )
}


interface PanelProps{
    children : JSXElement,
    active : boolean
}

function Panel(props: PanelProps) {
   return (
      <div classList={{
         [styles.hidden]: !props.active,
         [styles.container]: true
      }}>
         <RefreshProvider disabled={!props.active}>
            {props.children}
         </RefreshProvider>
      </div>
   )
}

interface PanelsProps{
   items : {
      text: string, 
      iconName: string, 
      component: ()=>JSXElement
   }[],
   activeItem : string
}

function Panels(props: PanelsProps){
   return (
      <div class={styles.content}>
         <For each={props.items}>
            {(item)=>(
               <Panel active={item.text===props.activeItem}>
                  {item.component()}
               </Panel>
            )}
         </For>
                  
      </div>
   )
}



interface VersionNumberProps {
    class?: string
}

export function VersionNumber(props: VersionNumberProps) {
    const [version, setVersion] = createSignal<string | undefined>(undefined)
    const [err, setErr] = createSignal<boolean>(false)

    const refreshCntxt = useRefreshContext()
    let lastUpdate = 0
    
    createEffect(async () => {
        if (!refreshValueUpdate(refreshCntxt?.listen(), {lastUpdate: lastUpdate, length:30000})) {
            return
        }
        try {
            let response = await System.sendVersion()
            setVersion(response.version)
            setErr(false)
        } catch (error) {
            setErr(true)
            setVersion(undefined)
            throw error
        }
    })
    
    return (
        <div class={props.class} classList={{[styles.rest_version]:true}}>
            <p>REST version:</p>
            <ValueDisplay value={version()} error={err()}></ValueDisplay>
        </div>
    )
}


function App() {
   const [activeItem, setActiveItem] = createSignal("Dashboard");
   
   const [updateDisabled, setUpdateDisabled] = createSignal(isDebug);
   const [updateInterval, setUpdateInterval] = createSignal(5000);


   const [moduleListDisabled, setModuleListDisabled] = createSignal(isDebug);
   const [moduleListUpdateInterval, setModuleListUpdateInterval] = createSignal(15000);

  const items : {text: string, iconName: Icons, component: ()=>JSXElement}[] = [
      { text: "Dashboard", iconName: "home", component: Dashboard },
      { text: "Scripts", iconName: "science", component: Scripts },
      { text: "Config", iconName: "build", component: Config },
      { text: "Device", iconName: "terminal", component: Device },
   ];
   return (
       <>
         <ModuleListProvider>
            <RefreshProvider disabled={updateDisabled()} autoRefreshPeriod={updateInterval()}>
               <header class={styles.hotbar}>
                  <button class={styles.logo}><img src={Public.images.minilogo} /></button>
                  <AutoScrollerP
                     class={styles.title}
                     value='Smart Modular Photo Bioreactor'
                  ></AutoScrollerP>
                  <div class={styles.hotbar_right}>
                     <Hotbar></Hotbar>
                  </div>
               </header>
               <div class={styles.main}>
                  <ul class={styles.sidebar}>
                     {items.map(item => (
                        <Item
                           text={item.text}
                           iconName={item.iconName}
                           active={activeItem}
                           onClick={() => setActiveItem(item.text)}
                        />
                     ))}
                     <div class={styles.sidebar_separator}></div>
                     <Show when={isDebug}>
                        <div class={styles.debug}>
                           <button onclick={e=>e.currentTarget.parentElement?.classList.toggle(styles.collapsed)}>Debug mode</button>
                           <DebugModuleEditor></DebugModuleEditor>
                           <DebugApiMessageHostnameEditor></DebugApiMessageHostnameEditor>
                           <DebugRefreshProviderInterval
                              title="api refresh"
                              interval={{
                                 getter: updateInterval,
                                 setter: setUpdateInterval
                              }}
                              disabled={{
                                 getter: updateDisabled,
                                 setter: setUpdateDisabled
                              }}
                           ></DebugRefreshProviderInterval>
                            <DebugRefreshProviderInterval
                              title="module list refresh"
                              interval={{
                                 getter: moduleListUpdateInterval,
                                 setter: setModuleListUpdateInterval
                              }}
                              disabled={{
                                 getter: moduleListDisabled,
                                 setter: setModuleListDisabled
                              }}
                           ></DebugRefreshProviderInterval>
                        </div>
                     </Show>
                     <VersionNumber></VersionNumber>
                  </ul>
                  <Panels 
                     items={items}
                     activeItem={activeItem()}
                  ></Panels>
               </div>
            </RefreshProvider>
            <RefreshProvider autoRefreshPeriod={moduleListUpdateInterval()}>
               <ModuleListRefresher
                  enabled={!moduleListDisabled()}
                  min_interval={100}
               ></ModuleListRefresher>
            </RefreshProvider>
         </ModuleListProvider>
      </>
   )
}

export default App
