// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: teal; icon-glyph: bolt;
/* ChzzkConfigStarts */
let layoutConfig = {
    "streams": [],
    "showHeader": 1,
    "profileImageWidth": 25
}
/* ChzzkConfigEnds */

const version = "1.1"
let systemDate = new Date()

let fm = FileManager.local()
const basePath = fm.joinPath(fm.libraryDirectory(), "/chzzk-alpha")
if(!fm.fileExists(basePath)){ fm.createDirectory(basePath) }

const configPath = fm.joinPath(basePath, "config.json")
if(fm.fileExists(configPath)){
    let temp = JSON.parse(fm.readString(configPath))
    for(key in temp){
        layoutConfig[key] = temp[key]
    }
}

const logoPath = fm.joinPath(basePath, "logo.png")
const cachePath = fm.joinPath(basePath, "cache.json")

try {
    if(!fm.fileExists(logoPath)){
        let image = await new Request("https://github.com/unvsDev/pixel-widget/assets/63099769/3f12ccc7-441a-41aa-803b-7f45526708a1").loadImage()
        fm.writeImage(logoPath, image)
    }
} catch(e){
    throw new Error("네트워크가 원활하지 않습니다.")
}

let presentWidget = false
if(config.runsInApp){
    await showEditor()
    fm.writeString(configPath, JSON.stringify(layoutConfig))
    
    if(!presentWidget){ return 0 }
}

async function showAlert(title, message){
    let alert = new Alert()
    alert.title = title
    alert.message = message
    alert.addAction("확인")
    await alert.presentAlert()
}

async function showStreamsPicker(channels){
    let picker = new UITable()
    picker.showSeparators = true
    
    let selectedIndex = -1
    
    function loadPicker(){
        for(i in channels){
            let temp = i
            
            let row = new UITableRow()
            row.height = 70
            
            let image = row.addImageAtURL(channels[i].channel.channelImageUrl)
            let text = row.addText(channels[i].channel.channelName, "팔로워 " + channels[i].channel.followerCount.toLocaleString() + "명")
            text.titleFont = Font.boldSystemFont(17)
            text.titleColor = Color.dynamic(new Color("#000000"), new Color("#00FFA1"))
            text.subtitleFont = Font.systemFont(14)
            text.subtitleColor = Color.dynamic(Color.gray(), Color.lightGray())
            
            let preview = row.addButton("채널 보기")
            preview.centerAligned()
            
            image.widthWeight = 20
            text.widthWeight = 50
            preview.widthWeight = 30
            
            picker.addRow(row)
            
            preview.onTap = () => {
                Safari.openInApp("https://chzzk.naver.com/" + channels[temp].channel.channelId)
            }
            
            row.onSelect = (n) => {
                selectedIndex = n
            }
        }
    }
    
    function refreshPicker(){
        picker.removeAllRows()
        loadPicker()
        picker.reload()
    }
    
    if(!channels.content.size){
        await showAlert("검색 결과가 없어요", "스트리머 닉네임을 정확히 입력해 주세요.")
        return null
    } else if(channels.content.data.length == 1){
        return channels.content.data[0].channel
        
    } else {
        channels = channels.content.data.sort((a, b) => b.channel.followerCount - a.channel.followerCount)
    }
    
    loadPicker()
    await picker.present()
    
    if(selectedIndex != -1){
        return channels[selectedIndex].channel
    } else {
        return null
    }
}

async function showEditor(){
    let editor = new UITable()
    editor.showSeparators = true
    
    function loadEditor(){
        let titleRow = new UITableRow()
        titleRow.height = 120

        let titleText = titleRow.addText("CHZZK Alpha", "버전 " + version + ", created by unvsDev")
        titleText.titleFont = Font.boldMonospacedSystemFont(26)
        
        let previewButton = UITableCell.button("위젯 미리보기")
        previewButton.rightAligned()
        previewButton.dismissOnTap = true
        
        titleText.widthWeight = 65
        previewButton.widthWeight = 35
        
        titleRow.addCell(previewButton)
        editor.addRow(titleRow)
        
        previewButton.onTap = () => {
            presentWidget = true
        }
        
        addHeader("스트리머 목록 (" + layoutConfig.streams.length + "/10)")
        
        let addStreamButton = new UITableRow()
        addStreamButton.height = 70
        addStreamButton.dismissOnSelect = false
        
        let addStreamText = addStreamButton.addText("\u{27A1}\u{FE0F} 새로 추가하기", "위젯에는 생방송 중인 스트리머가 4명까지 표시됩니다.")
        addStreamText.titleFont = Font.boldSystemFont(17)
        addStreamText.titleColor = Color.blue()
        addStreamText.subtitleFont = Font.systemFont(15)
        addStreamText.subtitleColor = Color.dynamic(Color.gray(), Color.lightGray())
        
        editor.addRow(addStreamButton)
        
        addStreamButton.onSelect = async () => {
            if(layoutConfig.streams.length >= 10){
                await showAlert("최대 10명까지 추가할 수 있어요", "다른 스트리머를 추가하려면, 기존 항목을 제거한 뒤 다시 시도해 주세요.")
                throw -1
            }
            
            let alert = new Alert()
            alert.title = "스트리머 이름을 입력하세요"
            alert.addTextField("", "")
            alert.addAction("확인")
            alert.addCancelAction("취소")
            
            let response = await alert.presentAlert()
            if(response == -1){ throw -1 }
            
            try {
                let channels = await new Request(`https://api.chzzk.naver.com/service/v1/search/channels?keyword=${encodeURI(alert.textFieldValue())}&offset=0&size=25`).loadJSON()
                
                let data = await showStreamsPicker(channels)
                
                if(data != null){
                    await addStreamToConfig(data)
                    refreshEditor()
                }
            } catch(e){
                await showAlert("오류가 발생했어요", e.name + ": " + e.message)
            }
        }
        
        for(let i = 0; i < layoutConfig.streams.length; i++){
            let temp = i
            
            let row = new UITableRow()
            row.height = 70
            row.dismissOnSelect = false
            
            let image = row.addImage(fm.readImage(fm.joinPath(basePath, layoutConfig.streams[i].channelId + ".jpg")))
            let text = row.addText(layoutConfig.streams[i].channelName)
            text.titleFont = Font.boldSystemFont(17)
            text.titleColor = Color.dynamic(new Color("#000000"), new Color("#00FFA1"))
            
            image.widthWeight = 20
            text.widthWeight = 80
            
            editor.addRow(row)
            
            row.onSelect = async (n) => {
                let alert = new Alert()
                alert.addAction("채널 보기")
                alert.addDestructiveAction("위젯에서 제거")
                alert.addCancelAction("취소")
                
                let response = await alert.presentSheet()
                
                if(response == 0){
                    Safari.openInApp("https://chzzk.naver.com/" + layoutConfig.streams[n-3].channelId)
                } else if(response == 1){
                    layoutConfig.streams.splice(n-3, 1)
                }
                
                refreshEditor()
            }
        }
        
        addHeader("위젯 설정")
        
        addBoolElement("showHeader", "상단 바로가기 표시", "로고 및 라이브, e스포츠, 라운지 바로가기를 표시합니다.")
        
        let clearRow = new UITableRow()
        clearRow.dismissOnSelect = false
        
        let clearText = clearRow.addText("스트리머 목록 초기화")
        clearText.titleColor = Color.red()
        
        editor.addRow(clearRow)
        
        clearRow.onSelect = async () => {
            let alert = new Alert()
            alert.title = "스트리머 목록을 초기화할까요?"
            alert.addDestructiveAction("확인")
            alert.addCancelAction("취소")
            
            let response = await alert.presentAlert()
            if(response != -1){
                layoutConfig.streams = []
                refreshEditor()
            }
        }
    }
    
    async function addStreamToConfig(data){
        try {
            let imgPath = fm.joinPath(basePath, data.channelId + ".jpg")
            let img = await new Request(data.channelImageUrl).loadImage()
            fm.writeImage(imgPath, img)
            
        } catch(e){
            await showAlert("오류가 발생했어요", e.name + ": " + e.message)
            return
        }
        
        layoutConfig.streams.push({
            "channelId": data.channelId,
            "channelName": data.channelName
        })
    }
    
    function addHeader(str){
        let header = new UITableRow()
        header.height = 45
        header.backgroundColor = Color.dynamic(new Color("#F5F5F5"), new Color("#18181A"))
        
        let text = header.addText("\u{25A0} " + str)
        text.titleColor = Color.gray()
        text.titleFont = Font.semiboldSystemFont(16)
        
        editor.addRow(header)
    }
    
    function addBoolElement(key, title, desc){
        let row = new UITableRow()
        row.height = 65
        row.dismissOnSelect = false
        
        let text = row.addText(title, layoutConfig[key] ? "켬" : "끔")
        text.titleFont = Font.semiboldSystemFont(16)
        text.subtitleFont = Font.systemFont(15)
        text.subtitleColor = Color.dynamic(Color.gray(), Color.lightGray())
        
        editor.addRow(row)
        
        row.onSelect = async () => {
            let alert = new Alert()
            alert.title = title
            alert.message = desc
            alert.addAction("켜기")
            alert.addAction("끄기")
            alert.addCancelAction("취소")
            
            let response = await alert.presentAlert()
            
            if(response != -1){
                layoutConfig[key] = 1 - response
            }
            
            refreshEditor()
        }
    }
    
    function refreshEditor(){
        editor.removeAllRows()
        loadEditor()
        editor.reload()
    }
    
    loadEditor()
    await editor.present()
}

/* ChzzkWidgetStarts */
let updateNeeded = false
try {
    if(!Keychain.contains("chzzk-updatecheck")){
        updateNeeded = true
    } else if(Keychain.get("chzzk-updatecheck") != systemDate.getHours().toString()){
        updateNeeded = true
    }
    
    if(updateNeeded){
        let service = await new Request("https://github.com/unvsDev/chzzk-alpha/raw/main/service.json").loadJSON()
        
        if(service.latest != version){
            let widget = await new Request(service.widget).loadString()
            let fmi = FileManager.iCloud()
            fmi.writeString(fmi.joinPath(fmi.documentsDirectory(), Script.name() + ".js"), widget)
            Keychain.set("chzzk-updatecheck", systemDate.getHours().toString())
            return 0
        } else {
            Keychain.set("chzzk-updatecheck", systemDate.getHours().toString())
        }
    }
} catch(e){
    
}

let cache = []
let offlineMode = false

try {
    for(let i = 0; i < layoutConfig.streams.length; i++){
        let channel = layoutConfig.streams[i]
        let liveStat = await new Request(`https://api.chzzk.naver.com/polling/v1/channels/${channel.channelId}/live-status`).loadJSON()
        
        if(liveStat.content.status == "CLOSE")
            continue
        
        cache.push({
            "channelId": channel.channelId,
            "channelName": channel.channelName,
            "category": liveStat.content.liveCategoryValue
        })
        
        if(cache.length >= 4)
            break
    }
    
    fm.writeString(cachePath, JSON.stringify({
        "content": cache
    }))
} catch(e){
    if(fm.fileExists(cachePath)){
        cache = JSON.parse(fm.readString(cachePath)).content
        offlineMode = true
    } else {
        throw new Error("네트워크 상태를 확인하세요.")
    }
}

let widget = new ListWidget()
widget.backgroundColor = new Color("#0E0E0F")
widget.refreshAfterDate = new Date(systemDate.getTime() + 1000 * 60 * 20)
// widget.setPadding(11,11,11,11)

const portal = [
    {
        "title": "라이브",
        "url": "navergameapp://chzzk"
    },
    {
        "title": "e스포츠",
        "url": "navergameapp://esports"
    },
    {
        "title": "라운지",
        "url": "navergameapp://"
    }
]

if(layoutConfig.showHeader){
    let headerStack = widget.addStack()
    headerStack.centerAlignContent()
    headerStack.setPadding(0,0,10,10)
    
    let serviceLogoImage = headerStack.addImage(fm.readImage(logoPath))
    serviceLogoImage.imageSize = new Size(55, 17)
    if(offlineMode){
        serviceLogoImage.tintColor = Color.gray()
    }
    
    headerStack.addSpacer()
    
    for(let i = 0; i < portal.length; i++){
        let portalText = headerStack.addText(portal[i].title)
        portalText.textColor = Color.lightGray()
        portalText.font = Font.boldSystemFont(15)
        portalText.url = portal[i].url
        
        if(i != portal.length - 1)
            headerStack.addSpacer()
    }
}

let vStack = widget.addStack()
vStack.layoutVertically()
// vStack.backgroundColor = new Color("#2C2C2C")
// vStack.setPadding(8,8,8,8)
// vStack.cornerRadius = 20

for(let i = 0; i < 2; i++){
    let hStack = vStack.addStack()
    hStack.layoutHorizontally()
    hStack.centerAlignContent()
    
    for(let j = 0; j < 2; j++){
        let streamerStack = hStack.addStack()
        streamerStack.layoutHorizontally()
        streamerStack.centerAlignContent()
        streamerStack.backgroundColor = new Color("#26262B")
        streamerStack.setPadding(6,6,6,6)
        streamerStack.cornerRadius = 8
        
        let vSpacer = streamerStack.addStack()
        vSpacer.layoutVertically()
        // vSpacer.size = new Size(0, layoutConfig.profileImageWidth + 8)
        vSpacer.addSpacer()
        
        if(2*i+j >= cache.length){
            streamerStack.addSpacer()
            
            let serviceLogoImage = streamerStack.addImage(fm.readImage(logoPath))
            serviceLogoImage.imageSize = new Size(55, 17)
            serviceLogoImage.tintColor = Color.gray()
            
            streamerStack.addSpacer()
        } else {
            streamerStack.url = "navergameapp://chzzk/live/" + cache[2*i+j].channelId
            
            let streamerProfileWrapper = streamerStack.addStack()
            streamerProfileWrapper.setPadding(4,4,4,4)
            streamerProfileWrapper.size = new Size(layoutConfig.profileImageWidth + 8, layoutConfig.profileImageWidth + 8)
            streamerProfileWrapper.borderColor = new Color("#00FFA1")
            streamerProfileWrapper.borderWidth = 2
            streamerProfileWrapper.cornerRadius = 30
            
            let streamerProfileImg = fm.readImage(fm.joinPath(basePath, cache[2*i+j].channelId + ".jpg"))
            let streamerProfileImage = streamerProfileWrapper.addImage(streamerProfileImg)
            streamerProfileImage.imageSize = new Size(layoutConfig.profileImageWidth, layoutConfig.profileImageWidth)
            streamerProfileImage.cornerRadius = 25
            
            let streamInfoStack = streamerStack.addStack()
            streamInfoStack.layoutVertically()
            streamInfoStack.setPadding(0,6,0,0)
            
            let hSpacer = streamInfoStack.addStack()
            hSpacer.addSpacer()
            
            let streamerTitle = streamInfoStack.addText(cache[2*i+j].channelName)
            streamerTitle.textColor = new Color("#00FFA1")
            streamerTitle.font = Font.boldSystemFont(17)
            streamerTitle.lineLimit = 1
            
            let liveCategory = streamInfoStack.addText(cache[2*i+j].category == "talk" ? "Just Chatting" : cache[2*i+j].category)
            liveCategory.textColor = Color.lightGray()
            liveCategory.font = Font.systemFont(13)
            liveCategory.lineLimit = 1
        }
        
        if(j != 1){ hStack.addSpacer(9) }
    }
    
    if(i != 1){ vStack.addSpacer(9) }
}

widget.presentMedium()
/* ChzzkWidgetEnds */