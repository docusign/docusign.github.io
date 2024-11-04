// Copyright © 2024 Docusign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT

import {TemplateActions} from "./templateActions.js" 

const NEW_TEMPLATE = "newTemplate";
const UPLOAD_TEMPLATE = "uploadTemplate";

/*
 * CLASS Templates
 */

class Templates {
    /***
     * Properties in this.templates
     *   templateId
     *   favorite -- boolean
     *   name
     *   allShare -- shared with everyone in the account
     *   description
     *   owner -- string
     *   folderId
     *   folderName
     *   created -- Date
     *   lastModified -- Date
     *   folderId -- the primary folderId
     *   folderName -- the primary folderName
     *   folders -- array of {folderId, name}
     *   matching -- eligible -- "autoMatch": "true" && lastUsed !have year 9999
     *               included -- lastUsed has year 9999 
     *               excluded -- "autoMatch": "false" or lastUsed has year 1752
     * 
     */
    templates = [];
    busy = false;

    /***
     * Properties for folders
     *   folderId
     *   name
     *   
     */
    folders = [];
    sharedFolders = [];
    folderHash = {}; // Just the real folders -- id: {name, listType}
    rootFolderIds = {}; // Unfortunately there is more than one ID for the "Templates" folder

    columns = [ // columns in the table
        {title: `&nbsp;<i class="fa fa-star"></i>`, data: "favorite",
            searchable: false,
            width: "8px",
            render: function ( datum, type, row ) {
                if (type === 'display' || type === 'filter') {
                    if (datum) {
                        return `&nbsp;<i class="fa fa-star"></i>`
                    } else {
                        return ""
                    }
                } else {
                    //debugger;
                    return datum;
                }
            }
        },
        {title: "Shared All", data: "allShare",
            searchable: false,
            width: "20px",
            render: function ( datum, type, row ) {
                if (type === 'display' || type === 'filter') {
                    if (datum) {
                        return `&nbsp;<i class="fa fa-check"></i>`
                    } else {
                        return ""
                    }
                } else return datum
            }
        },
        /**
         *   matching -- Eligible -- autoMatch": "true" && lastUsed !have year 9999
         *               Included -- lastUsed has year 9999 
         *               Excluded - "autoMatch": "false" or lastUsed has year 1752
         */
        {title: "Matching", data: "match", width: "30px"},
        {title: "Name", data: "name", width: "350px"},  
        {title: "Owner", data: "owner", width: "150px"},
        {title: "Created Date", data: "created",
            searchable: false,
            width: "120px",
            render: function ( datum, type, row ) {
                const DateTime = luxon.DateTime;
                if (type === 'display') {
                    // https://moment.github.io/luxon/#/formatting
                    const dt = DateTime.fromMillis(datum);  
                    return `${dt.toLocaleString(DateTime.DATE_MED)}<br/>` + 
                        `<span class="smaller">${dt.toLocaleString(DateTime.TIME_WITH_SECONDS)}</span>`
                } else {
                    return datum;
                }
            }
        },
        {title: "Last Change", data: "lastModified",
            searchable: false,
            width: "120px",
            render: function ( datum, type, row ) {
                const DateTime = luxon.DateTime;
                if (type === 'display') {
                    // https://moment.github.io/luxon/#/formatting
                    const dt = DateTime.fromMillis(datum);  
                    return `${dt.toLocaleString(DateTime.DATE_MED)}<br/>` + 
                        `<span class="smaller">${dt.toLocaleString(DateTime.TIME_WITH_SECONDS)}</span>`
                } else {
                    return datum;
                }
            }
        },
        {title: "Folders", data: "folders",
            render: function ( datum, type, row ) {
                if (type === 'display') {
                    if (datum && datum.length > 0) {
                        const html = datum.reduce((priorV, val) =>
                            (priorV + `<a class="folderList" href="#"
                                data-folderId="${val.listType}|${val.folderId}">${val.name}</a>`),
                            "");
                        return html;
                    } else {return ""}
                } else if (type === 'filter') {
                    if (datum && datum.length > 0) {
                        const text = datum.reduce((priorV, val) =>
                            (priorV + `${val.name} `),
                            "");
                        return text
                    } else {return ""}
                } else if (type === 'sort') {
                    if (datum && datum.length > 0) {
                        const text = datum[0].name;
                        return text
                    } else {return ""}
                } else return datum
            }
        },
        {title: "", data: "templateId",
            searchable: false,
            orderable: false,
            render: function ( datum, type, row ) {
                if (type === 'display') {
                    const html = `
<div class="dropdown templateAction" data-templateId="${datum}" >
    <button class="btn btn-primary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        Actions
    </button>
    <ul class="dropdown-menu">
        <li><a class="dropdown-item" href="#" data-action="edit">Edit</a></li>
        <li><a class="dropdown-item" href="#" data-action="copy">Copy</a></li>
        <li><a class="dropdown-item" href="#" data-action="matchInclude">Include in Matching</a></li>
        <li><a class="dropdown-item" href="#" data-action="matchExclude">Exclude in Matching</a></li> 
        <li><a class="dropdown-item" href="#" data-action="delete">Delete</a></li>
        <li><a class="dropdown-item" href="#" data-action="download">Download</a></li>
        <li><a class="dropdown-item" href="#" data-action="allShare">Share with All</a></li>
        <li><a class="dropdown-item" href="#" data-action="allUnshare">Unshare with All</a></li>
    </ul>
</div>`
                        return html;
                } else return null
            }
        },
    ]

    constructor(args) {
        this.showMsg = args.showMsg;
        this.messageModal = args.messageModal;
        this.loader = args.loader;
        this.clientId = args.clientId;
        this.accountId = args.accountId;
        this.callApi = args.callApi;
        this.mainElId = args.mainElId;
        this.templatesTitleId = args.templatesTitleId;
        this.templatesTableElId = args.templatesTableId;
        this.logger = args.logger;
        this.padding = args.padding;

        this.templateActions = new TemplateActions({
            showMsg: args.showMsg,
            messageModal: args.messageModal,
            loader: args.loader,
            clientId: args.clientId,
            accountId: args.accountId,
            callApi: args.callApi,
            mainElId: args.mainElId,
            logger: args.logger,  
        })

        this.dataTableApi = null;
        this.folderClicked = this.folderClicked.bind(this);
        $(`#${this.templatesTableElId}`).on ('click', ".folderList", this.folderClicked);

        this.actionClicked = this.actionClicked.bind(this);
        $(`#${this.templatesTableElId}`).on ('click', ".templateAction a", this.actionClicked);
        $(`#${NEW_TEMPLATE}, #${UPLOAD_TEMPLATE}`).on ('click', this.actionClicked);

        this.list = this.list.bind(this);
    }

    /***
     * list
     *   lists the templates; maintains the list in memory; displays in data table
     */
    async list(args) {
        /***
         * listType chart:
         * 
         * listType; title; Templates:list options  
         *   myTemplates; "My Templates" (default list);  ...?user_filter=owned_by_me
         *   sharedFolder; "{folder_name}" A shared folder; ...?folder_ids=cec6a98a-e900-4b22-9e10-f1988835348a
         *   subFolder; "{folder_name}" A subfolder; ...?user_filter=owned_by_me&folder_ids=c4a54e3e-601a-40f8-ba8d-4297433a2d23
         *   favorites; "Favorites"; ...?user_filter=favorited_by_me
         *   allTemplates; "All Templates"; ... [no filters]
         *   deleted; "Deleted"; ... ?folder_ids=3a7df8c0-6713-448b-a907-d27ac94d1e02&folder_types=recyclebin 
         *                  Above is the "recylebin" folderId
         */
        if (args && args.listType) {
            this.listType = args.listType; // see chart:
            this.folderId = args.folderId; // used for sharedFolder and subFolder listTypes
            this.title = args.title;
        } 
        // else use the prior values

        $(`#${this.templatesTitleId}`).text(this.title); // Set the table's title

        // Templates:list query parameters
        let qp = {user_filter: null, folder_ids: null, folder_types: null};
        if (this.listType === "myTemplates") {
            qp.user_filter = "owned_by_me";
        } else if (this.listType === "sharedFolder") {
            qp.folder_ids = this.folderId;
        } else if (this.listType === "subFolder") {
            qp.user_filter = "owned_by_me";
            qp.folder_ids = this.folderId;
        } else if (this.listType === "favorites") {
            qp.user_filter = "favorited_by_me";
        } else if (this.listType === "deleted") {
            qp.folder_types = "recyclebin";
            qp.folder_ids = this.recyclebinId;
        } else if (this.listType === "allTemplates") {
            qp.folder_types = null;
            qp.folder_ids = null;
        } 

        const batch = 40; // how many to get per call (count request property)
        let startPosition = 0; // same as the received set size
        let totalSetSize = null
        let ok = true;
        this.templates = []; // reset

        $(`#${this.mainElId}`).attr("hidden", "");
        this.loader.show("Listing the templates");
        while (ok && (totalSetSize === null || startPosition < totalSetSize)) {
            let apiMethod = `/accounts/${this.accountId}/templates` + 
            `?start_position=${startPosition}&count=${batch}` +
            `&include=recipients,favorite_template_status,workflow`;
            Object.keys(qp).forEach(k => {
                if (qp[k]) {
                    apiMethod += `&${k}=${qp[k]}`
                }
            })
            const results = await this.callApi.callApiJson({
                apiMethod: apiMethod,
                httpMethod: "GET"
            });
            if (results !== false) { // good result 
                totalSetSize = parseInt(results.totalSetSize); // convert to integer 
                startPosition += parseInt(results.resultSetSize);
                this.loader.show(`Received ${startPosition} of ${totalSetSize} templates`);
                results.envelopeTemplates && results.envelopeTemplates.forEach(v => {
                    const template = {
                        templateId: v.templateId,
                        favorite: v.favoritedByMe && v.favoritedByMe === "true",
                        name: v.name,
                        allShare: v.shared && v.shared === "true",
                        description: v.description,
                        owner: v.owner.userName,
                        created: Date.parse(v.created),
                        lastModified: Date.parse(v.lastModified),
                        folderId: v.folderId,
                        folderName: v.folderName,
                        folders: [],
                    }
                    if (v.folderName === "Templates") {
                        this.rootFolderIds[v.folderId] = true;
                    }
                    /**
                     *   matching -- Eligible -- autoMatch": "true" && lastUsed !have year 9999
                     *               Included -- lastUsed has year 9999 
                     *               Excluded - "autoMatch": "false" or lastUsed has year 1752
                     */
                    const lastUsedYear = v.lastUsed && v.lastUsed.substring(0,4);
                    const alwaysInclude = lastUsedYear === "9999";
                    const alwaysExclude = lastUsedYear === "1752";
                    v.autoMatch = v.autoMatch === "true"; // convert to boolean
                    let match;
                    if (v.autoMatch && !alwaysInclude) {
                        match = "Eligible"
                    } else if (alwaysInclude) {
                        match = "Included"
                    } else if (!v.autoMatch || alwaysExclude) {
                        match = "Excluded"
                    }
                    template.match = match;

                    v.folderIds.forEach((fv, i) => {
                        // array of folderId. Create folders array of {folderId, name}
                        if (!this.rootFolderIds[fv]) template.folders.push({
                            folderId: fv, 
                            name: this.folderHash[fv].name, 
                            listType: this.folderHash[fv].listType
                        })
                    })
                    this.templates.push(template);
                })
            } else {
                this.loader.hide();
                $(`#${this.mainElId}`).removeAttr("hidden");
                this.messageModal({
                    style: 'text', title: "Template list problem", msg:
                        `<p>Error message: ${this.callApi.errMsg}</p>`
                });
                this.logger.post("Templates:list Problem: Operation Canceled", `<p>Error message: ${this.callApi.errMsg}</p>`);
                ok = false;
            }
        }

        this.loader.show("Creating the templates table");
        if (this.dataTableApi) {
            // reload the table with new data
            this.dataTableApi
                .clear()
                .rows.add(this.templates)
                .draw();
        } else {
            // created the brand-new table!
            this.dataTableApi = new DataTable(`#${this.templatesTableElId}`,
                {
                    columns: this.columns, 
                    data: this.templates,
                    fixedHeader: true,
                    autoWidth: false,
                    layout: {
                        topStart: {search: {placeholder: 'Search'}},
                        topEnd: null,
                        bottomStart: [{info: {
                            text: 'Showing _START_ to _END_ of _TOTAL_ templates.'
                        }}, 'pageLength'],
                        bottomEnd: 'paging',
                    },
                    language: {
                        infoFiltered: '(Filtered from _MAX_ total templates.)',
                        emptyTable: 'No templates found.'
                    }            
                }                
            );
        }
        this.loader.hide();
        $(`#${this.mainElId}`).removeAttr("hidden");
        $(`#${this.templatesTableElId}`).removeAttr("hidden");
    }

    /***
     * folderFetch
     * Gets list of folders, and stores in folders
     * Also looks up the everyoneGroup ID
     */
    async folderFetch() {
        let startPosition = 0; // same as the received set size
        let totalSetSize = null
        let ok = true;

        //$(`#${this.mainElId}`).attr("hidden", "");
        //this.loader.show("Listing the template folders");
        
        while (ok && (totalSetSize === null || startPosition < totalSetSize)) {
            const results = await this.callApi.callApiJson({
                apiMethod: `/accounts/${this.accountId}/folders?` +
                    `&start_position=${startPosition}&` + 
                    `user_filter=owned_by_me&include=envelope_folders,template_folders,` + 
                    `shared_template_folders&sub_folder_depth=-1`,
                httpMethod: "GET"
            });
            if (results !== false) { // good result 
                totalSetSize = parseInt(results.totalSetSize); // convert to integer 
                const resultSetSize = parseInt(results.resultSetSize);
                // API bug fix
                if (totalSetSize < resultSetSize) {
                    totalSetSize = resultSetSize
                }
                startPosition += parseInt(results.resultSetSize);
                //this.loader.show(`Received ${startPosition} of ${totalSetSize} templates folders`);
                results.folders.forEach(folder => {
                    if (folder.type === "recyclebin") {
                        folder.name = "Deleted";
                        folder.icon = "fa fa-trash";
                        folder.id = "deleted|";
                        this.recyclebinId = folder.folderId;
                        this.rootFolderIds[folder.folderId] = true;
                        this.folders.push(folder);
                    } else if (folder.type === "templates") {
                        folder.name = "Folders";
                        folder.icon = "fa fa-folder";
                        this.folders.push(folder);
                    } else if (folder.type === "sharedtemplates") {
                        this.folderHash[folder.folderId] = {name: folder.name, listType: `sharedFolder`};
                        this.sharedFolders.push(folder)
                        folder.id = `sharedFolder|${folder.folderId}`;                
                    }
                })
            } else {
                //this.loader.hide();
                //$(`#${this.mainElId}`).removeAttr("hidden");
                this.messageModal({
                    style: 'text', title: "Folder list problem", msg:
                        `<p>Error message: ${this.callApi.errMsg}</p>`
                });
                this.logger.post("Folders:list Problem: Operation Canceled", `<p>Error message: ${this.callApi.errMsg}</p>`);
                ok = false;
            }
        }
    return ok && await this.everyoneGroup();
    }

    /***
     * looks up and sets this.everyoneGroupId here and in this.templateActions
     */
    async everyoneGroup() {
        let startPosition = 0; // same as the received set size
        let totalSetSize = null
        let ok = true;
        this.everyoneGroupId = false;

        while (ok && !this.everyoneGroupId && (totalSetSize === null || startPosition < totalSetSize)) {
            const results = await this.callApi.callApiJson({
                apiMethod: `/accounts/${this.accountId}/groups?` +
                    `&start_position=${startPosition}&count=50`,
                httpMethod: "GET"
            });
            if (results !== false) { // good result 
                totalSetSize = parseInt(results.totalSetSize); // convert to integer 
                const resultSetSize = parseInt(results.resultSetSize);
                startPosition += parseInt(results.resultSetSize);
                results.groups.forEach(group => {
                    if (group.groupType === "everyoneGroup") {
                        this.everyoneGroupId = group.groupId;
                        this.templateActions.everyoneGroupId = group.groupId;
                    }
                })
            } else {
                this.messageModal({
                    style: 'text', title: "Grouplist problem", msg:
                        `<p>Error message: ${this.callApi.errMsg}</p>`
                });
                this.logger.post("Group list Problem: Operation Canceled", `<p>Error message: ${this.callApi.errMsg}</p>`);
                ok = false;
            }
            return ok
        }
    }

    /***
     * folderClicked
     * An item in the tree or a folder name in a row was clicked. Reload the templates appropriately
     */
    async folderClicked(evt) {
        evt.preventDefault();
        if (this.busy) {return}; // EARLY return
        this.busy = true;
        // figure out if the event is from the treeview or datatable
        const datatableId = $(evt.target).attr("data-folderId");
        const treeId = $(evt.target).closest('div')[0].id;
        const id = datatableId || treeId;
        const takeAction = id && id.indexOf("|") !== -1;
        if (!takeAction) {
            this.busy = false;
            return; // EARLY return
        }

        const name = $(evt.target).text() // the name of the folder
        const splits = id.split('|');
        const listType = splits[0];
        const folderId = !!splits[1] && splits[1];
        await this.list({title: name, listType: listType, folderId: folderId});
        this.busy = false;
    }

    /***
     * actionClicked handles the template actions
     *  data-action="edit"
     *  data-action="copy"
     *  data-action="matchInclude"
     *  data-action="matchExclude"
     *  data-action="delete"
     *  data-action="download"
     *  data-action="allShare"
     *  data-action="allUnshare"
     * 
     *  And buttons:
     *  data-action="newTemplate" 
     *  data-action="uploadTemplate"
     */
    async actionClicked(evt) {
        evt.preventDefault();
        $(`#${this.mainElId}`).attr("hidden", "");
        $(`#${this.templatesTableElId}`).attr("hidden", "");

        const action = $(evt.target).attr("data-action");
        const templateId = $(evt.target).closest('.templateAction').attr("data-templateId");
        const templateEntry = this.templates.find(t => t.templateId === templateId);
        const templateName = templateEntry ? templateEntry.name : "";
        
        const redoList = await this.templateActions.action({action: action, templateId: templateId,
            list: this.list, templateName: templateName
        })
        
        $(`#${this.mainElId}`).removeAttr("hidden");
        $(`#${this.templatesTableElId}`).removeAttr("hidden");
        if (redoList) {
            this.list()
        }
    }

    /***
     * renderTree
     */
    renderTree(args) {
        this.treeId = args.treeId;

        this.folders.forEach(folder => {this.processFolder(folder)});
        this.sharedFolders.forEach(folder => {this.processFolder(folder)});
        // fix things up -- add some pseudo folders, etc
        const allTemplates = {text: "All Templates", icon: "fa fa-folder", id: "allTemplates|"};
        const myTemplates = {text: "My Templates", icon: "fa fa-folder", id: "myTemplates|"};
        const favorites = {text: "Favorites", icon: "fa fa-star", id: "favorites|"};
        const sharedFolders = {text: "Shared Folders", icon: "fa fa-folder",
            nodes: this.sharedFolders};

        this.folders.unshift(myTemplates, favorites, allTemplates);
        this.folders.push(sharedFolders);
        
        $(`#${this.treeId}`).bstreeview({
            data: this.folders,
            expandIcon: 'fa fa-angle-down fa-fw',
            collapseIcon: 'fa fa-angle-right fa-fw',
            indent: 1.25,
            parentsMarginLeft: '1.25rem',
            openNodeLinkOnNewTab: true
        });
        $(".bstvNode").on("click", this.folderClicked);
    }

    /***
     * processFolder is a recursive function to set up the structure the
     * way the tree view wants it
     */
    processFolder(folder) {
        function renameProp(old, now){
            Object.defineProperty(folder, now,
                Object.getOwnPropertyDescriptor(folder, old));
            delete folder[old];    
        }
        if (folder.type !== "recyclebin"){
            folder.icon = "fa fa-folder"
            if (this.folderHash[folder.folderId]) {
                this.folderHash[folder.folderId].name = folder.name;
            } else {
                this.folderHash[folder.folderId] = {name: folder.name};
            }
        }
        if (folder.parentFolderId) {
            folder.id = `subFolder|${folder.folderId}`;
            this.folderHash[folder.folderId].listType = `subFolder`;
        }

        folder.hasSubFolders = folder.hasSubFolders === "true";
        renameProp("name", "text");
        folder.expanded = false;
        if (folder.hasSubFolders) {
            renameProp("folders", "nodes");
            // recursion!
            folder.nodes.forEach(node => {this.processFolder(node)})
        }
    }

    /***
     * Destroy the table and any other cleanup
     */
    destroyTable() {
        if (this.dataTableApi) {
            this.dataTableApi.destroy();
            $(`#${this.templatesTableElId}`).empty();
        }
    }

}

export { Templates };
