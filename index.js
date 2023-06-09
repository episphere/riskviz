import * as xlsx from "https://cdn.sheetjs.com/xlsx-0.19.2/package/xlsx.mjs";
import localforage from 'https://cdn.skypack.dev/localforage';


// Setup LF and Load the data...
let dataDB = localforage.createInstance({
    name        : 'riskviz',
    storeName   : 'data'
})
// data is stored in these two files...  maybe make this a function
// so we can let the user set it...  if so, you but url encode the 
let files=['General Table for Screening v5.xlsx','General Table for Post-Colpo_v5.xlsx']
//let baseURL='https://episphere.github.io/riskviz/data/'
let baseURL='./data/'

async function cache_data(file,dta){    
    // get first sheet...
    console.log(dta)
    let sheet = dta.Sheets[ dta.SheetNames[0] ]
    let array = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" })
    let headers = array.shift()

    let data={
        'headers':headers,
        'rows':array.map( (row)=> row.reduce( 
            (pv,cv,indx)=>{
                pv[headers[indx]]=cv;
                return pv
            },{} )),
        'unique_values':{}
        }
    
    // add unique values of all columns up-to column "N"
    for ( let [indx,colname] of headers.entries()){
        if (colname == "N") break;
        let s = new Set(array.map((row)=>row[indx]))
        data.unique_values[colname] = Array.from(s.values())
    }
    console.log(data)

    dataDB.setItem(file, data)
}
async function loadFiles(){
    let dbKeys = await dataDB.keys()

    await Promise.all ( 
        files.map( async (file) => {
            // if the data is already cached... don't waste your time
            if (!dbKeys.includes(file)){
                let dta=await url_read_excel(`${baseURL+encodeURIComponent(file)}`)
                console.log(dta)
                cache_data(file,dta)
            }else{
                console.log(`file ${file} already cached..`)
            }
        })
    )
}
loadFiles()

function displayResults(){
    build_filtered_table()
}

function build_select_element(unique_values,value){
    let labelElement = document.createElement("label")
    labelElement.innerText=`${value} `
    let selectElement = document.createElement("select")
    selectElement.dataset.colname=value
    labelElement.appendChild(selectElement)
    selectElement.addEventListener("change",displayResults)

    unique_values[value].forEach( (v,indx) => {
        let opt=document.createElement("option")
        opt.innerText=v
        opt.value=indx
        selectElement.insertAdjacentElement("beforeend",opt)
    })
    return labelElement
}
function build_select_inputs(unique_values){
    let div=document.getElementById("fileSpecificSelect")
    div.innerText=""
    for (let value in unique_values){
        console.log(`building ${value}`)
        div.insertAdjacentElement('beforeend',build_select_element(unique_values,value)) 
        div.insertAdjacentHTML('beforeend',"<br>")
    }
}

async function fillFileElement(){
    // fill the input with the filename...
    let selected = document.getElementById("colpoEl").value
    document.getElementById("fileReadEl").value=`data: ${files[selected]}`

    // get the column names...
    let fileData = await dataDB.getItem(files[selected])
    build_select_inputs(fileData.unique_values)
}
document.getElementById("colpoEl").addEventListener("change", fillFileElement)
fillFileElement()




let lfcache = "";

async function url_read_excel(url){
    const data = await (await fetch(url)).arrayBuffer()
    return xlsx.read(data)
}


function getHeader(sheet) {
    let header = []
    let range = xlsx.utils.decode_range(sheet["!ref"])
    for (let c = 0; c <= range.e.c - range.s.c; c++) {
        header[c] = (sheet[`${xlsx.utils.encode_col(c + range.s.c)}1`]?.v) ? sheet[`${xlsx.utils.encode_col(c + range.s.c)}1`].v : "";
    }
    return header
}

async function build_filtered_table(tableElement){
    let div = document.getElementById("fileSpecificSelect")
    div.querySelectorAll("select").map( s => ({s[dataset][colname]: "hi"}) )


    let selected = document.getElementById("colpoEl").value
    let all_data = await dataDB.getItem(files[selected])

    
//    let filtered_rows = all_data.filter()

    console.log(files[selected])
    console.log(all_data)
}

const sheetDiv = document.getElementById("sheetDiv");
function fillSheetDiv(tableElement,data,active_sheet){
    sheetDiv.innerText=""
    if (data.sheets.length<2) return
    console.log(active_sheet)
    data.sheets.forEach( (sheet,index) => {
        let aElement = document.createElement("input")
        console.log(sheet,active_sheet,sheet==active_sheet)
        if (sheet==active_sheet) aElement.checked=true
        aElement.id=`Sheet_${index}`
        aElement.classList.add("btn-check")
        aElement.type="radio"
        aElement.value=sheet
        aElement.innerText=sheet
        aElement.name="sheet"
        aElement.setAttribute("autocomplete","off")
        aElement.addEventListener("change",()=>{
            build_table(tableElement,data,sheet)
        })
        sheetDiv.insertAdjacentElement("beforeend",aElement)
        sheetDiv.insertAdjacentHTML("beforeend",`<label for=${aElement.id} class="mx-2 mb-2 btn btn-outline-dark">${aElement.value}`)
    })
}
function build_table(tableElement, data, sheet="") {

    console.log(`calling build_table ${sheet}`)
    function isFloat(x) {
        return !isNaN(parseFloat(x)) && !Number.isInteger(parseFloat(x))
    }
    function rnd4(x) {
        return (Math.round(x * 10000) / 10000).toFixed(4)
    }

    console.log(data)
    if (sheet=="") {
        sheet=data.sheets[0]
    }
    fillSheetDiv(tableElement,data,sheet)
    data=data[sheet]

    tableElement.innerText = ""
    // build the table header
    let tHead = tableElement.createTHead()
    let tr = tableElement.insertRow()

    data.header.forEach(col => {
        let th = tr.insertCell()
        th.outerHTML = `<th>${col}</th>`
    })

    // build the table body...
    let tBody = tableElement.createTBody();
    console.log(data.data)
    data.data.forEach((row, index) => {
        tr = tableElement.insertRow()
        row.forEach((col, indx) => {
            let td = tr.insertCell();
            td.setAttribute("nowrap", "true")
            td.innerText = (isFloat(col)) ? rnd4(col) : col;
        })
    })
    console.log(data.data)
}








