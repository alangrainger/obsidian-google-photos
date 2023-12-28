import { ItemView, WorkspaceLeaf, moment } from 'obsidian';
import MyPlugin, {VIEW_TYPE} from './main';
import { GridView, ThumbnailImage } from './renderer'
import { dateToGoogleDateFilter, GooglePhotosDateFilter } from 'photosApi'
import {
    getDailyNoteSettings,
    getAllDailyNotes,
    getDailyNote,
} from "obsidian-daily-notes-interface";


export class DailyPhotosView extends ItemView {
    // vueApp: App;
    plugin: MyPlugin;
    gridView: GridView;
    photoDate: string | undefined;
    container: Element;

    constructor(leaf: WorkspaceLeaf, plugin: MyPlugin) {
        super(leaf);
        this.plugin = plugin;

		// rerender at midnight
		this.registerInterval(
			window.setInterval(
				() => {
                    // console.log(this.photoDate, this.plugin.currentFile)
                    if (this.plugin.currentFile && this.photoDate !== this.plugin.currentFile) {
                        this.photoDate = this.plugin.currentFile;
                        this.updateView();
                    }
				},
				1700,
			),
		);
    }

    getViewType(): string {
        return VIEW_TYPE;
    }

    getDisplayText(): string {
        return "Daily Google Photos";
    }

    getIcon(): string {
        return "camera";
    }

    async insertImageIntoEditor(event: MouseEvent) {
        console.log(event)
    }

    async onOpen(this: DailyPhotosView) {
        this.container = this.containerEl.children[1];
        this.container.empty();
        this.gridView = new GridView({
            scrollEl: this.containerEl,
            plugin: this.plugin,
            onThumbnailClick: event => this.insertImageIntoEditor(event)
        })
        // Attach the grid view to the modal
        this.container.appendChild(this.gridView.containerEl)
    }

    isDailyNotesEnabled() {
        const dailyNotesPlugin = this.app.internalPlugins.plugins["daily-notes"];
        const dailyNotesEnabled = dailyNotesPlugin && dailyNotesPlugin.enabled;
    
        const periodicNotesPlugin = this.app.plugins.getPlugin("periodic-notes");
        const periodicNotesEnabled =
          periodicNotesPlugin && periodicNotesPlugin.settings?.daily?.enabled;
    
        return dailyNotesEnabled || periodicNotesEnabled;
    }

    async updateView() {
        let { folder, format } = getDailyNoteSettings();
        console.log(format, this.plugin.currentFilePath)

        if (!this.isDailyNotesEnabled()) return;
        if (!this.plugin.currentFile) return;
        if (!this.plugin.currentFilePath) return;
        if (!this.plugin.currentFilePath.endsWith('.md')) return;

        let filePathWithoutExt = this.plugin.currentFilePath.substring(0, this.plugin.currentFilePath.length - 3);
        if (folder) {
            console.log(folder);
            if (!filePathWithoutExt.startsWith(folder)) return;
            console.log(filePathWithoutExt.substring(folder.length + 1), format);
            if (!moment(filePathWithoutExt.substring(folder.length + 1), format, true).isValid()) return;
        }
        else {
            if (!moment(filePathWithoutExt, format, true).isValid()) return;
        }
        console.log('passed!')

        const date = this.plugin.currentFile.substring(0, 10)
        const xDaysBeforeDate = moment(date).subtract(this.plugin.settings.showPhotosXDaysPast, 'days')
        const xDaysAfterDate = moment(date).add(this.plugin.settings.showPhotosXDaysFuture, 'days')
        const dateFilter: GooglePhotosDateFilter = {
            ranges: [{
                startDate: dateToGoogleDateFilter(xDaysBeforeDate),
                endDate: dateToGoogleDateFilter(xDaysAfterDate)
            }]
        } as object
        this.gridView.resetGrid()
        this.gridView.setTitle(date)
        this.gridView.setSearchParams({
            filters: {
                dateFilter
            },
            orderBy: "MediaMetadata.creation_time"
        })
        this.gridView.getThumbnails().then()
    }

    async onClose() {
        this.gridView?.destroy()
    }
    onunload(): void {
    }
}