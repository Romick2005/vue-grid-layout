//let currentDir: "ltr" | "rtl" | "auto"  = "auto";
let currentDir = "auto";//"ltr", "rtl", "auto"

function hasDocument(){
    return (typeof document !== "undefined");
}

function hasWindow(){
    return (typeof window !== "undefined");
}

export function getDocumentDir(){
    if(!hasDocument()){
        return currentDir;
    }
    const direction = (typeof document.dir !== "undefined") ?
        document.dir :
        document.getElementsByTagName("html")[0].getAttribute("dir");
    return direction;
}

export function setDocumentDir(dir){//dir: "ltr" | "rtl" | "auto"
// export function setDocumentDir(dir){
    if (!hasDocument) {
        currentDir = dir;
        return;
    }

    const html = document.getElementsByTagName("html")[0];
    html.setAttribute("dir", dir);
}

export function addWindowEventListener(event, callback) {//event:string, callback: () => mixed
    if (!hasWindow) {

        callback();
        return;
    }
    window.addEventListener(event, callback);
}

export function removeWindowEventListener(event, callback) {//event:string, callback: () => mixed
    if (!hasWindow) {
        return;
    }
    window.removeEventListener(event, callback);
}



