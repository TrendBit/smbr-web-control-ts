import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show, type JSX, type JSXElement } from "solid-js";
import { CodeMirrorWrapper } from "./CodeMirrorWrapper";

import codeStyles from "./CodePart.module.css";
import fileListStyles from "./FileList.module.css";
import runtimeInfoStyles from "./RuntimeInfo.module.css";
import textEditorStyles from "./TextEditor.module.css"
import { Button } from "../../../../lib/web-components/Button/Button";
import { Icon } from "../../../components/Icon/Icon";
import { RefreshProvider, refreshValueUpdate, useRefreshContext } from "../../../../lib/web-components/other/RefreshProvider";
import { ApiInvalidStatusCodeError, type targetsType } from "../../../apiMessages/apiMessageBase";
import { parseApiMessageFileList, sendApiMessageDeleteFile, sendApiMessageGetFileContent, sendApiMessageGetFileList, sendApiMessageSetFileContent, type apiMessageGetFileContentResult, type FileListDirectory } from "../../../apiMessages/apiMessageFileOperations";
import { Scheduler } from "../../../apiMessages/scheduler/_";
import { AutoScrollerP } from "../../../../lib/web-components/AutoScroller/AutoScroller";
import { PopupPanel, type Popup } from "../Widget";



interface FileListElementProps {
  data: FileListDirectory,
  maxDepth?: number,
  dirsOnly?: boolean,

  isRoot?: boolean,

  searchText?: ()=>(string | undefined),

  // the full previous path
  prefixPath?: string,

  // gets the currently selected file
  activeFileName : ()=>string | undefined

  // callback called when a file is selected
  onSelect: (fileName : string)=>void;

  onFileCreate?: (dirName : string)=>void;
}

function FileListElement(props: FileListElementProps) {
  let self : HTMLUListElement | undefined;
  const isRoot = createMemo(() =>
    props.isRoot ?? true
  );
  const prefixPath = createMemo(() =>
    (props.prefixPath ?? "") +
    (isRoot() ? (
      ""
    ) : (
      props.data.name + "|"
    ))
  );

  function isSearchFor(searchText : string|undefined | undefined, fileName : string){
    console.debug(`checking: "${searchText}" with "${fileName}`)
    return (searchText!==undefined)?(
      fileName.startsWith(searchText)
    ):(
      undefined
    )
  }
  
  return (
    <ul 
      classList={{
        [fileListStyles["directory"]]:!isRoot(),
        [fileListStyles["root"]]:isRoot(),
        [fileListStyles["collapsed"]]:true,
        [fileListStyles["search_filtered"]]: props.searchText?.() !== undefined
      }}
      ref={self}
    >
      <Show when={!isRoot()}>
        <div classList={{
          [fileListStyles["directory-header"]]:true,
          [fileListStyles["last-directory"]]:props.maxDepth === 0
        }}>

          <button
            class={fileListStyles["collapse-button"]}
            onclick={e => { 
              self?.classList.toggle(fileListStyles["collapsed"]) 
            }}
          >
            <AutoScrollerP 
              class={fileListStyles["directory-name"]} 
              value={props.data.name}
            ></AutoScrollerP>
            <div class={fileListStyles["collapse-arrow"]}>
              <Icon name="keyboard_arrow_down"></Icon>
            </div>
          </button>
          
          <Show when={props.onFileCreate}>
            <button class={fileListStyles["create-file-specific-button"]}
              onclick={()=>props.onFileCreate?.(prefixPath())}
            >
              <Icon name="add"></Icon>
            </button>
          </Show>

        </div>
      </Show>
      <Show when={(props.maxDepth ?? 1)>0}>
        <For each={Object.entries(props.data.subDirectories)}>
          {(directory, index) => (
            <FileListElement 
              maxDepth={(props.maxDepth)?(props.maxDepth-1):(undefined)} 
              data={directory[1]}
              isRoot={false}
              onSelect={props.onSelect}
              prefixPath={prefixPath()}
              activeFileName={props.activeFileName}
              onFileCreate={props.onFileCreate}
              dirsOnly={props.dirsOnly}
              searchText={props.searchText}
            ></FileListElement>
          )}
        </For>
        <Show when={!props.dirsOnly}>
          <For each={props.data.files}>
            {(fileName, index) => (
              <li 
                classList={{
                  [fileListStyles["file"]]:true,
                  [fileListStyles["active"]]: (props.activeFileName() === prefixPath()+fileName),
                  [fileListStyles["search_result"]]: isSearchFor(props.searchText?.(),fileName) ?? false,
                  [fileListStyles["not_search_result"]]: !(isSearchFor(props.searchText?.(),fileName) ?? true)
                }}
                onclick={()=>{props.onSelect(prefixPath()+fileName)}}
              >
                <AutoScrollerP 
                  class={fileListStyles["directory-name"]} 
                  value={fileName}
                ></AutoScrollerP>
              </li>
            )}
          </For>
        </Show>
      </Show>
    </ul>
  )
}

interface FileListProps {
  buttons?: ((index: number) => JSXElement)[],
  createFileButton?: {
    onClick: (fileName: string) => Promise<boolean>
  },
  files: FileListDirectory | undefined
  maxDepth?: number
  onlyDirectories? : boolean

  onSelect: (fileName : string) => void;
  activeFileName: ()=>string | undefined;

  pathPrefix?: string
}

function FileList(props: FileListProps) {
  let newFileInput : HTMLInputElement | undefined;
  let newFileContainer : HTMLDivElement | undefined;

  const [searchText, setSearchText] = createSignal<string>();

  return (
    <div class={fileListStyles.container}>
      <div class={fileListStyles.search}>
        <input 
          class={fileListStyles["search-field"]} 
          placeholder="type in to search..."
          onInput={(e)=>{
            if(e.currentTarget.value !== ""){
              setSearchText(e.currentTarget.value.replaceAll("/","|"));
            } else {
              setSearchText(undefined);
            }
          }}
        ></input>
      </div>
      <div class={fileListStyles["button-panel"]}>
        <Show when={props.buttons}>
          <For each={props.buttons}>
            {(button, index) => (
              button(index())
            )}
          </For>
        </Show>
        <Show when={props.createFileButton}>
          <div 
            ref={newFileContainer}
            class={fileListStyles["create-button-container"] + " " + fileListStyles["collapsed"]}
          >
            <div class={fileListStyles["create-button-inputs"]}>
              <input 
                ref={newFileInput}
                class={"button " + fileListStyles["create-button-text-input"]} 
                placeholder="file name"
              ></input>
              <button 
                class={"button " + fileListStyles["create-button-button-input"]}
                onclick={async e => {
                  if(newFileInput){
                    if(await props.createFileButton?.onClick(newFileInput.value)){
                      newFileContainer?.classList.toggle(fileListStyles["collapsed"]) ;
                    }
                  }
                }}
              >create</button>
            </div>
            <button class={fileListStyles["create-button-handle"]}

              onclick={e => {
                newFileContainer?.classList.toggle(fileListStyles["collapsed"])
              }}>

              <Icon name="add_circle" filled={false}></Icon>
            </button>
          </div>
        </Show>
      </div>
      <div class={fileListStyles.list}>
        <FileListElement 
          data={props.files ?? {name:"root",files:[],subDirectories:{}}}
          onSelect={props.onSelect}
          activeFileName={props.activeFileName}
          maxDepth={props.maxDepth}
          prefixPath={props.pathPrefix}
          searchText={searchText}
          onFileCreate={
            (props.createFileButton)?(
              (fileName : string)=>{
                if(newFileInput && newFileContainer){
                  newFileInput.value = fileName;
                  newFileContainer.classList.remove(fileListStyles.collapsed);
                }
              }
            ):undefined
          }
          dirsOnly={props.onlyDirectories}
        ></FileListElement>
      </div>
    </div>
  )
}

function TwoColFileList(props: FileListProps){
  const [activeDirectory, setActiveDirectory] = createSignal<string | undefined>();

  function getEmpty() : FileListDirectory{
    return  {
      name: "root",
      subDirectories: {},
      files: []
    };
  }

  function getActiveDirContent(directories : FileListDirectory | undefined, active: string | undefined) : FileListDirectory{
    if(directories && active){
      return directories.subDirectories[active] ?? getEmpty();
    }
    return getEmpty();
  } 

  function getPathPrefix(prop : string | undefined, active : string | undefined) : string | undefined{
    if(prop){
      return prop + (active ?? "")
    }
    if(active){
      return (prop ?? "") + active + "|"
    }
    return undefined
  }
  
  return (
    <>
      <div class={fileListStyles.container}>
        <div class={fileListStyles.list}>
          <For each={Object.entries(props.files?.subDirectories ?? {})}>
            {(directory, index)=>(
              <button 
                classList={{
                  [fileListStyles.two_col_directory]: true,
                  [fileListStyles.active]: activeDirectory()===directory[1].name
                }}
                onclick={()=>setActiveDirectory(directory[0])}
              >
                <div>
                  <AutoScrollerP value={directory[1].name}></AutoScrollerP>
                  <Icon 
                    name="keyboard_arrow_right"
                    class={fileListStyles.icon}
                  ></Icon>
                </div>
              </button>
            )}
          </For>
        </div>
      </div>
      
      <FileList
        files={getActiveDirContent(props.files,activeDirectory())}
        onSelect={props.onSelect}
        activeFileName={props.activeFileName}
        createFileButton={props.createFileButton}
        buttons={props.buttons}
        pathPrefix={getPathPrefix(props.pathPrefix,activeDirectory())}
      ></FileList>
    </>
  )
}


interface RuntimeInfoProps {
  
}

function OutputContainer(props: { children?: JSXElement, title: string, info?: string, class?: string , style?: string}) {
  return (
    <div style={props.style} class={runtimeInfoStyles["output-container"] + " " + props.class}>
      <div class={runtimeInfoStyles["oc-header"]}>
        <h2 class={runtimeInfoStyles["oc-title"]}>{props.title}</h2>
        <p>{props.info}</p>
      </div>
      <div class={runtimeInfoStyles["oc-body"]}>
        {props.children}
      </div>
    </div>
  )
}

function TwoColTable(props: { data: twoColTableRow[], leftSize: string }) {
  return (
    <div class={runtimeInfoStyles["two-col-table"]}>
      <For each={props.data}>
        {(line, index) => (
          <div class={runtimeInfoStyles["tc-table-line"]}>
            <p style={"min-width: " + props.leftSize} class={runtimeInfoStyles["left"]}>{line.left}</p>
            <p class={runtimeInfoStyles["right"]}>{line.right}</p>
          </div>
        )}
      </For>
    </div>
  )
}

function statusImg(state : "Running" | "Paused" | "Stopped" | "NeverStarted"){
  switch(state){
    case "Running":
      return "clock_loader_10";
    case "Paused":
      return "pause_circle";
    case "Stopped":
      return "stop_circle";
    case "NeverStarted":
      return "stop_circle";
  }
  
}

type twoColTableRow = {
  left: string,
  right: string
}

function RuntimeInfo(props: RuntimeInfoProps) {
  const refreshCntxt = useRefreshContext();
  const [selected, setSelected] = createSignal<string | undefined>(undefined);
  const [status, setStatus] = createSignal<"Running" | "Paused" | "Stopped" | "NeverStarted">("Paused");
  const [callStack, setCallStack] = createSignal<twoColTableRow[]>([]);
  const [consoleOut, setConsoleOut] = createSignal<twoColTableRow[]>([]);
  const [processID, setProcessID] = createSignal<number>(0);
  const [scriptContent, setScriptContent] = createSignal("string");
  const [startedAt, setStartedAt] = createSignal<Date | undefined>(undefined);
  const [calledLines, setCalledLines] = createSignal<number[]>([]);

  async function updateScriptPreview(){
    let result = await Scheduler.sendGetScheduled();

    setSelected(result.fileName);
    setScriptContent(result.content);
  }

  let lastUpdate = 0;
  createEffect(async ()=>{
    if(refreshValueUpdate(refreshCntxt?.listen(),{length: 10000,lastUpdate:lastUpdate})){
      lastUpdate = Date.now();
      await updateScriptPreview();
    }

    if(refreshValueUpdate(refreshCntxt?.listen())){
      let result = await Scheduler.sendRuntimeInfo();

      let newCalledLines : number[] = [];
      let newCallStack : twoColTableRow[]= [];
      for(let line of result.stack){
        newCallStack.push({
          left: line.toString(),
          right: scriptContent().split("\n")[line-1]
        })
        newCalledLines.push(line);
      }

      let newConsoleOut : twoColTableRow[] = [];
      for(let outLine of result.output){
        newConsoleOut.push({
          left: outLine.timeStamp,
          right: outLine.output
        })
      }

      if(selected() != result.name){
        await updateScriptPreview();
      }

      setCallStack(newCallStack);
      setConsoleOut(newConsoleOut);
      setStatus(result.state);
      setProcessID(result.processId);
      setStartedAt(result.startedAt);
      setCalledLines(newCalledLines);
    }
  })

  async function stop(){
      await Scheduler.sendStopScheduled();
      return true;
  }


  async function start(){
      await Scheduler.sendStartScheduled();
      return true;
  }


  function getStatusColor(status : "Running" | "Paused" | "Stopped" | "NeverStarted") : string{
    switch (status) {
      case "Running":
        return "var(--acc-color-4)"
      case "Paused":
        return "var(--warn-color-3)"
      case "Stopped":
        return "var(--err-color-3)"
      case "NeverStarted":
        return "var(--warn-color-3)"
    
      default:
        return "white";
    }
  }

  function getRunningFor(startedTime : Date | undefined):string{
    if(startedTime){
      return ((Date.now()-startedTime.getTime())/1000)+" seconds (work in progress)"
    }
    return "---";
  }

  function getStartedAt(startedTime : Date | undefined):string{
    if(startedTime){
      return startedAt()?.toDateString() + " "+ startedAt()?.toLocaleTimeString()
    }
    return "---";
  }


  return (
    <div class={runtimeInfoStyles.container}>
      <div class={runtimeInfoStyles.header}>
        <h1>
          Runtime Info
        </h1>
        <Button class={runtimeInfoStyles["start-button"]}
          callback={start}
          disabled={selected()===undefined}
          tooltip="Start script"
          disabledTooltip="no script loaded"
        >
          <Icon 
            name="play_arrow"
            class={runtimeInfoStyles.icon}
          ></Icon>
        </Button>
        <Button class={runtimeInfoStyles["stop-button"]}
          callback={stop}
          disabled={selected()===undefined}
          tooltip="Pause script"
          disabledTooltip="no script loaded"
        >
          <Icon 
            name="pause"
            class={runtimeInfoStyles.icon}
          ></Icon>
        </Button>
      </div>
      <div class={runtimeInfoStyles.body}>
        <div class={runtimeInfoStyles.header1}>
          <div class={runtimeInfoStyles["selected-script"]}>
            <p>Selected script:</p>
            <h2 class={runtimeInfoStyles["selected-script-name"]}>{selected() ?? "---"}</h2>
          </div>
          <div class={runtimeInfoStyles["selected-id"]}>
            <p>Process id:</p>
            <h2 class={runtimeInfoStyles["selected-id-name"]}>{processID()}</h2>
          </div>
        </div>
        <div class={runtimeInfoStyles.header2}>
          <div class={runtimeInfoStyles["running-stats"]}>
            <p>Started at: </p>
            <h2 class={runtimeInfoStyles["started-at"]}>{getStartedAt(startedAt())}</h2>
          </div>
        </div>
        
        <div class={runtimeInfoStyles.body2}>
          <div class={runtimeInfoStyles["info-panel"]}>
            <OutputContainer title="CALL STACK" class={runtimeInfoStyles["call-stack"]}>
              <TwoColTable data={callStack()} leftSize={"30px"}>

              </TwoColTable>
            </OutputContainer>
            <div class={runtimeInfoStyles["status"]}>
              <h2>Status: {status()}</h2>
              <div 
                classList={{
                  [runtimeInfoStyles["status-img"]]:true,
                  [runtimeInfoStyles["spinning"]]: status()=="Running"
                }}
                style={{
                  color: getStatusColor(status())
                }}
              >
                <Icon filled={false} name={statusImg(status())}></Icon>
              </div>
            </div>
          </div>
          <OutputContainer title="OUTPUT" class={runtimeInfoStyles["log-ouptut"]} info={consoleOut().length.toString() + " logs"}>
            <TwoColTable data={consoleOut()} leftSize={"50px"}>
            </TwoColTable>
          </OutputContainer>
          <OutputContainer class={runtimeInfoStyles["script-preview"]} title="SELECTED SCRIPT PREVIEW" info="read-only view">

            <CodeMirrorWrapper 
              initialValueGetter={scriptContent} 
              readOnly={true}
              highlightedLines={calledLines()}
            ></CodeMirrorWrapper>

          </OutputContainer>
        </div>
      </div>
    </div>
  )
}


function VisibilityHandle(props:{
  direction: "Left" | "Right",
  text: string,
  getter: ()=>boolean,
  setter: (value: boolean)=>void
}){
  function toggle(){
    props.setter(!props.getter());
  }

  return (
    <button 
      classList={{
        [textEditorStyles.visibility_handle]:true,
        [textEditorStyles.left]:props.direction=="Left",
        [textEditorStyles.right]:props.direction=="Right",
        [textEditorStyles.visible]:!props.getter()
      }}
      onclick={toggle}
    >
      <div class={textEditorStyles.visible_content}>
        
      </div>
      <div class={textEditorStyles.hidden_content}>
        <Icon name={(props.direction==="Right")?("arrow_back_ios_new"):("arrow_forward_ios")}></Icon>
        <p>{props.text}</p>
        <Icon name={(props.direction==="Right")?("arrow_back_ios_new"):("arrow_forward_ios")}></Icon>
      </div>
      <div class={textEditorStyles.visible_content}>
        
      </div>
    </button>
  )
}

function SlideDrawer(props:{
  children: JSXElement,
  direction: "Left" | "Right",
  hidden: boolean,
  maxWidth?: string,
  minWidth?: string
}){
  function getStyle(hidden: boolean,maxWidth?: string,minWidth?:string): JSX.CSSProperties {
    if(maxWidth!==undefined){
      return {
        "max-width": hidden?(0):(maxWidth),
        "min-width": hidden?(undefined):(minWidth)
      }
    }else{
      return {
        "width": hidden?(0):(undefined)
      }
    }
  }
  return (
    <div 
      classList={{
        [textEditorStyles.visibility_drawer]:true
      }}
      style={getStyle(props.hidden,props.maxWidth,props.minWidth)}
    >
      {props.children}
    </div>
  )
}

interface TextEditorProps {
  twoColFileList? : boolean;
  runtimeInfo? : RuntimeInfoProps;
  allowFileCreation? : boolean;
  allowFileDeletion? : boolean;

  targetEndpoint: string;
  target?: targetsType
}

export function TextEditor(props : TextEditorProps) {
  let runtimeInfo!: HTMLDivElement;
  const refreshCntxt = useRefreshContext();

  // this is the currently edited, local version of a file
  const [fileName,setFileName] = createSignal<string | undefined>();
  const [fileContent,setFileContent] = createSignal<string | undefined>();
  const [fileList, setFileList] = createSignal<FileListDirectory | undefined>();
  const [dirtyFlag, setDirtyFlag] = createSignal<boolean>(false);
  const [errorMessages, setErrorMessages] = createSignal<Popup[]>([]);

  const [runtimeInfoHidden, setRuntimeInfoHidden] = createSignal<boolean>(true);
  const [fileListHidden, setfileListHidden] = createSignal<boolean>(false);

  // this is the currently edited, original version of a files content.
  const [downloadedScriptContent, setDownloadedScriptContent] = createSignal<string>("");

  function addErrorMessage(message : string,details : string){
    setErrorMessages([...errorMessages(),{
      message: message,
      details: details,
      severity: "error"
    }]);
  }

  function unsavedChangesCheck() : boolean{
    if(dirtyFlag()){
      if(!window.confirm("you have unsaved changes, do you want to continue?")){
        return false;
      }else{
        setDirtyFlag(false);
      }
    }
    return true;
  }
  
  async function loadFile(fileName : string) : Promise<boolean>{
    try {
      if(unsavedChangesCheck()){
        let result = await sendApiMessageGetFileContent({
          fileName: fileName,
          url: props.targetEndpoint,
          target: props.target
        }) 
  
        setDownloadedScriptContent(result.content);
        setFileName(fileName)
        setFileContent(result.content)
        return true;
      }
    } catch (error) {
      setFileName(undefined)
      setFileContent(undefined)
      if(error instanceof ApiInvalidStatusCodeError){
        addErrorMessage("unable to read file contents",error.responseMessage ?? "unknown error");
      }
      throw error;
    }
    return false;
  }

  async function uploadToServer() : Promise<boolean>{
    let currFileName = fileName();
    let currFileContent = fileContent();
    if(currFileName !== undefined && currFileContent !== undefined){    
      if(dirtyFlag()){
        try {
          await sendApiMessageSetFileContent({
            fileName: currFileName,
            content: currFileContent,
            url: props.targetEndpoint,
            target: props.target
          });
        } catch (error) {
          if(error instanceof ApiInvalidStatusCodeError){
            addErrorMessage("unable to upload file contents",error.responseMessage ?? "unknown error");
          }
          throw error;
        }
  
        setDirtyFlag(false);
        return true;
      }
    }
    return false;
  }

  async function deleteFile() : Promise<boolean>{
    let currFileName = fileName();
    if(currFileName !== undefined){
      if(unsavedChangesCheck()){
        if(await !window.confirm(`are you sure you want to dele the file named "${currFileName}"?`)){
          return false;
        }
        try {
          await sendApiMessageDeleteFile({
            fileName: currFileName,
            url: props.targetEndpoint,
            target: props.target
          })
        } catch (error) {
          if(error instanceof ApiInvalidStatusCodeError){
            addErrorMessage("unable to delete the file",error.responseMessage ?? "unknown error");
          }
          throw error;
        }

        setDownloadedScriptContent(" ");
        setFileName(undefined);
        setFileContent(undefined);
        reloadFileList(true);
        return true;
      }
    }
    return false;
  }

  

  let lastFileList : string[] | undefined = undefined; 
  async function reloadFileList(reloadFromFileSystem: boolean){
    try {

      let response = await sendApiMessageGetFileList({
        url:props.targetEndpoint,
        target: props.target,
        reloadFromFileSystem: reloadFromFileSystem
      })

      if(lastFileList){
        if(response.recipes.length == lastFileList.length){
          let noChange = true;
          for(let i =0; i< lastFileList.length;i++){
            if(response.recipes[i] != lastFileList[i]){
              noChange = false;
              break;
            }
          }
          if(noChange){
            return;
          }
        }
      }
      lastFileList = response.recipes;
      setFileList(parseApiMessageFileList(response.recipes));

    } catch (error) {
      setFileList(undefined);
      throw error;
    }
  }

  async function createFile(fileName : string) : Promise<boolean>{
    let fileExists : boolean = false;
    try {
      await sendApiMessageGetFileContent({
        fileName: fileName,
        url: props.targetEndpoint,
        target: props.target
      })
      fileExists = true;
    } catch (error) {

    }

    if(fileExists){
      return false;
    }
    try {
      await sendApiMessageSetFileContent({
        fileName: fileName,
        content: "",
        url: props.targetEndpoint,
        target: props.target
      })
    } catch (error) {
      if(error instanceof ApiInvalidStatusCodeError){
        addErrorMessage("unable to create the file",error.responseMessage ?? "unknown error");
      }
      throw error;
    }

    reloadFileList(true);
    return true;
  }

  async function scheduleFile() : Promise<boolean>{
    let currFile = fileName();
    if(currFile && !dirtyFlag()){
      try {
        await Scheduler.sendSetScheduled({
          fileName: currFile
        })
      } catch (error) {
        if(error instanceof ApiInvalidStatusCodeError){
          addErrorMessage("unable to schedule the file",error.responseMessage ?? "unknown error");
        }
        throw error;
      }
      return true;
    }
    return false;
  }

  function blockUnload(this: Window, ev: BeforeUnloadEvent) {
    if (dirtyFlag()) {
      ev.preventDefault();
    }
  }

  onMount(()=>{
    window.addEventListener('beforeunload',blockUnload);
  })

  onCleanup(()=>{
    window.removeEventListener('beforeunload',blockUnload);
  })

  createEffect(async ()=>{
    if(refreshValueUpdate(refreshCntxt?.listen())){
      await reloadFileList(refreshCntxt?.listen().forced ?? false);
    }
  })

  return (
    <div style={{
      display: "flex",
      "min-width": 0,
      flex: "1 1 auto"
    }}>

      <SlideDrawer
        direction="Left"
        hidden={fileListHidden()}
        maxWidth={(props.twoColFileList===undefined)?("200px"):("400px")}
        minWidth={(props.twoColFileList===undefined)?("200px"):("400px")}
      >
        <Show when={props.twoColFileList}
          fallback={
            <FileList 
              buttons={[() => (
                <Button
                  callback={async ()=>(await reloadFileList(true))}
                  tooltip="Reload files from the device file system"
                >reload from fileSystem</Button>
              )]} 
              files={
                fileList()
              } 
              createFileButton={(props.allowFileCreation)?(
                {
                  onClick: async val => (await createFile(val.replaceAll("/","|")))
                }
              ):(
                undefined
              )}
              onSelect={(value:string)=>{
                loadFile(value);
              }}
              activeFileName={fileName}
            ></FileList>
          }
        >
          <TwoColFileList
            buttons={[() => (
              <Button
                callback={async ()=>(await reloadFileList(true))}
                tooltip="Reload files from the device file system"
              >reload from fileSystem</Button>
            )]} 
            files={
              fileList()
            } 
            createFileButton={(props.allowFileCreation)?(
              {
                onClick: async val => (await createFile(val.replaceAll("/","|")))
              }
            ):(
              undefined
            )}
            onSelect={(value:string)=>{
              loadFile(value);
            }}
            activeFileName={fileName}
          ></TwoColFileList>
        </Show>
      </SlideDrawer>

      <VisibilityHandle
        text="file list"
        direction="Left"
        getter={fileListHidden}
        setter={setfileListHidden}
      ></VisibilityHandle>
      

      <div
        classList={{
          [codeStyles.container]: true,
          [codeStyles.unsaved]: dirtyFlag(),
          [codeStyles.error] : errorMessages().length > 0
        }}
        style={{ "flex": "1 1 auto", "min-width": 0, "min-height": 0 }}
      >
        <div class={codeStyles.header}>
          <Show when={props.allowFileDeletion ?? true}>
            <Button
              disabled={dirtyFlag() || fileName() === undefined}
              callback={deleteFile}
              tooltip="Delete the current file"
              disabledTooltip={(fileName() !== undefined)?("unsaved changes"):("no file loaded")}
            >
              <Icon name="delete" class={codeStyles.icon}></Icon>
            </Button>
          </Show>

          <h1 class={codeStyles["file-name"]}>
            {(fileName() ?? "No file loaded").replaceAll("|","/")}
          </h1>
          
          <Button
            disabled={(!dirtyFlag()) || fileName() === undefined}
            callback={uploadToServer}
            tooltip="Save the file"
            disabledTooltip={(fileName() !== undefined)?"all changes saved":"no file loaded"}
          >
            <Icon name="upload" class={codeStyles.icon}></Icon>
          </Button>

          <Show when={props.runtimeInfo !== undefined}>
            <Button
              disabled={dirtyFlag() || fileName() === undefined}
              callback={scheduleFile}
              tooltip="Send current file to scheduler"
              disabledTooltip={(fileName() !== undefined)?"unsaved changes":"no file loaded"}
            >
              <Icon name="share_windows" class={codeStyles.icon}></Icon>
            </Button>
          </Show>
          
        </div>
        <div class={codeStyles["code-editor"]}>
          <PopupPanel
            getter={errorMessages}
            setter={setErrorMessages}
          ></PopupPanel>
          <CodeMirrorWrapper
            initialValueGetter={downloadedScriptContent}
            onChange={(value: string)=>{
              setFileContent(value);
              setDirtyFlag(true);
            }}
            readOnly={fileName() === undefined}
            onSave={uploadToServer}
          ></CodeMirrorWrapper>
        </div>
      </div>


      <Show when={props.runtimeInfo}>
        <VisibilityHandle
          text="runtime info"
          direction={"Right"}
          getter={runtimeInfoHidden}
          setter={setRuntimeInfoHidden}
        ></VisibilityHandle>
        <SlideDrawer
          direction={"Right"}
          hidden={runtimeInfoHidden()}
          maxWidth="800px"
          minWidth="700px"
        >
          <RefreshProvider autoRefreshPeriod={runtimeInfoHidden()?(undefined):(250)}>
            <RuntimeInfo></RuntimeInfo>
          </RefreshProvider>
        </SlideDrawer>
      </Show>
    </div>
  )
}
