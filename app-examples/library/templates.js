// Copyright © 2024 Docusign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT

/*
 * CLASS Templates
 * The Templates examples
 *
 * args -- an object containing attributes:
 *   showMsg -- function to show a msg to the human
 *   clientId -- the actual clientId
 *   callApi -- instance of CallApi
 *   envelopes -- instance of Envelopes
 *   
 * public values
 */

/***
 * Public variables
 * signing -- is the signing window open?
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
    busy = false; // loading via a tree click?

    /***
     * Properties for folders
     *   folderId
     *   name
     *   
     */
    folders = [];
    sharedFolders = [];
    folderHash = {}; // Just the real folders -- id: name

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
                            (priorV + `<a href="#" data-folderId="${val.folderId}">${val.name}</a> `),
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
    ]

    constructor(args) {
        this.showMsg = args.showMsg;
        this.messageModal = args.messageModal;
        this.loadingModal = args.loadingModal;
        this.loader = args.loader;
        this.clientId = args.clientId;
        this.accountId = args.accountId;
        this.callApi = args.callApi;
        this.mainElId = args.mainElId;
        this.templatesTitleId = args.templatesTitleId;
        this.templatesTableElId = args.templatesTableId;
        this.logger = args.logger;
        this.padding = args.padding;

        this.dataTableApi = null;
        this.treeClicked = this.treeClicked.bind(this);
    }

    /***
     * list
     *   lists the templates; maintains the list in memory; displays in data table
     */
    async list(args) {
        const listType = args.listType; // see chart:
        /***
         * listType; title; Templates:list options  
         *   myTemplates; "My Templates" (default list);  ...?user_filter=owned_by_me
         *   sharedFolder; "{folder_name}" A shared folder; ...?folder_ids=cec6a98a-e900-4b22-9e10-f1988835348a
         *   subFolder; "{folder_name}" A subfolder; ...?user_filter=owned_by_me&folder_ids=c4a54e3e-601a-40f8-ba8d-4297433a2d23
         *   favorites; "Favorites"; ...?user_filter=favorited_by_me
         *   all; "All Templates"; ... [no filters]
         *   deleted; "Deleted"; ... ?folder_ids=3a7df8c0-6713-448b-a907-d27ac94d1e02&folder_types=recyclebin 
         *                  Above is the "recylebin" folderId
         */
        const folderId = args.folderId; // used for sharedFolder and subFolder listTypes
        const title = args.title;
        $(`#${this.templatesTitleId}`).text(title); // Set the table's title

        // Templates:list query parameters
        let qp = {user_filter: null, folder_ids: null, folder_types: null};
        if (listType === "myTemplates") {
            qp.user_filter = "owned_by_me";
        } else if (listType === "sharedFolder") {
            qp.folder_ids = folderId;
        } else if (listType === "subFolder") {
            qp.user_filter = "owned_by_me";
            qp.folder_ids = folderId;
        } else if (listType === "favorites") {
            qp.user_filter = "favorited_by_me";
        } else if (listType === "deleted") {
            qp.folder_types = "recyclebin";
            qp.folder_ids = this.recyclebinId;
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
                        if (v.folderName !== "Templates" || i > 0) template.folders.push(
                            {folderId: fv, name: this.folderHash[fv]}) 
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
                        infoFiltered: '(Filtered from _MAX_ total templates.)'
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
                        this.folders.push(folder);
                    } else if (folder.type === "templates") {
                        folder.name = "Folders";
                        folder.icon = "fa fa-folder";
                        this.folders.push(folder);
                    } else if (folder.type === "sharedtemplates") {
                        this.folderHash[folder.folderId] = folder.name;
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
    return ok
    }

    /***
     * treeClicked
     * An item in the tree was clicked. Reload the templates appropriately
     */
    async treeClicked(evt) {
        if (this.busy) {return}; // EARLY return
        this.busy = true;
        const id = $(evt.target).closest('div')[0].id;
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
     * renderTree
     */
    renderTree(args) {
        this.treeId = args.treeId;

        this.folders.forEach(folder => {this.processFolder(folder)});
        this.sharedFolders.forEach(folder => {this.processFolder(folder)});
        // fix things up -- add some pseudo folders, etc
        const myTemplates = {text: "My Templates", icon: "fa fa-folder", id: "myTemplates|"};
        const favorites = {text: "Favorites", icon: "fa fa-star", id: "favorites|"};
        const sharedFolders = {text: "Shared Folders", icon: "fa fa-folder",
            nodes: this.sharedFolders};

        this.folders.unshift(myTemplates, favorites);
        this.folders.push(sharedFolders);
        
        $(`#${this.treeId}`).bstreeview({
            data: this.folders,
            expandIcon: 'fa fa-angle-down fa-fw',
            collapseIcon: 'fa fa-angle-right fa-fw',
            indent: 1.25,
            parentsMarginLeft: '1.25rem',
            openNodeLinkOnNewTab: true
        });
        $(".bstvNode").on("click", this.treeClicked);
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
            this.folderHash[folder.folderId] = folder.name;
        }
        if (folder.parentFolderId) {
            folder.id = `subFolder|${folder.folderId}`;
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

}

export { Templates };
