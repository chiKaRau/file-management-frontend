import { Component, HostListener, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { VirtualService } from './services/virtual.service';

@Component({
  selector: 'app-virtual',
  templateUrl: './virtual.component.html',
  styleUrls: ['./virtual.component.scss']
})
export class VirtualComponent implements OnInit {
  currentPath: string = '';
  fullDirectories: any[] = [];
  fullFiles: any[] = [];
  virtualItems: any[] = [];
  globalSelectedItems: any[] = [];

  selectedFile: any = null;
  viewMode: string = 'extraLarge';
  loading: boolean = false;
  selectedModelVersion: any = null;

  // Navigation history
  history: string[] = [];
  historyIndex: number = -1;
  canGoBack: boolean = false;
  canGoForward: boolean = false;

  // Drive filtering
  availableDrives: string[] = [];
  selectedDrive: string = 'all';

  // New property to display updating status
  updateStatus: string = '';

  // True = grouping mode on, false = normal mode
  groupingMode = false;

  // groupingSubTab now can be 'grouped', 'ungrouped', or 'suggest'
  groupingSubTab: 'grouped' | 'ungrouped' | 'suggest' = 'grouped';

  // New: The digit input for suggestion combinations (default is 2)
  suggestDigit: number = 2;

  // Sidebar state: open/closed.
  groupingSidebarOpen: boolean = false;

  // NEW: Store the tokens coming from the sidebar input (e.g. ["Ameku", "Takao"])
  selectedTokens: string[] = [];

  // inside VirtualComponent
  suggestionSubTab = '';

  constructor(private virtualService: VirtualService, private http: HttpClient) { }

  ngOnInit(): void {
    this.currentPath = this.virtualService.getCurrentPath() || '\\ACG\\';
    this.addToHistory(this.currentPath);
    this.loadContent(this.currentPath);
  }

  loadContent(path: string): void {
    // Clear previous data.
    this.fullDirectories = [];
    this.fullFiles = [];
    this.virtualItems = [];
    this.loading = true;

    this.virtualService.setCurrentPath(path);
    const basePath = path;

    forkJoin({
      dirs: this.virtualService.getDirectories(path),
      files: this.virtualService.getFiles(path)
    }).subscribe({
      next: ({ dirs, files }) => {
        const dirPayload = (dirs && dirs.payload) ? dirs.payload : dirs;
        const filePayload = (files && files.payload) ? files.payload : files;

        // Map directories.
        this.fullDirectories = Array.isArray(dirPayload)
          ? dirPayload.map((dir: any) => {
            const displayName = this.selectedDrive === 'all'
              ? `${dir.directory} (${dir.drive})`
              : dir.directory;
            return {
              isDirectory: true,
              name: dir.directory,
              displayName,
              drive: dir.drive,
              path: basePath + (basePath.endsWith('\\') ? '' : '\\') + dir.directory + '\\'
            };
          })
          : [];

        // Map files.
        this.fullFiles = Array.isArray(filePayload)
          ? filePayload.map((item: any) => {
            const model = item.model;
            return {
              isFile: true,
              name: model.name,
              drive: item.drive,
              path: basePath + (basePath.endsWith('\\') ? '' : '\\') + model.name,
              scanData: model,  // from database; may be outdated
              isDeleted: false,
              imageUrl: (model.imageUrls && model.imageUrls.length > 0) ? model.imageUrls[0].url : ''
            };
          })
          : [];

        console.log("Current Path files: ");
        console.log(this.fullFiles);

        // Update available drives.
        const drivesSet = new Set<string>();
        this.fullDirectories.forEach(dir => drivesSet.add(dir.drive));
        this.fullFiles.forEach(file => drivesSet.add(file.drive));
        this.availableDrives = Array.from(drivesSet);
        console.log('Available Drives:', this.availableDrives);

        // Combine items.
        this.combineItems();
        this.loading = false;
        this.updateNavigationFlags();
      },
      error: (err) => {
        console.error('Error fetching virtual content:', err);
        this.loading = false;
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.sidebar')) {
      this.selectedFile = null;
    }
  }

  combineItems(): void {
    let allItems = [...this.fullDirectories, ...this.fullFiles];
    if (this.selectedDrive !== 'all') {
      allItems = allItems.filter(item =>
        item.drive && item.drive.toUpperCase() === this.selectedDrive.toUpperCase()
      );
    }
    this.virtualItems = allItems;
    console.log('Filtered virtualItems:', this.virtualItems);
  }

  onPathChange(newPath: string): void {
    if (!newPath.endsWith('\\')) {
      newPath += '\\';
    }
    if (newPath !== this.currentPath) {
      this.history = this.history.slice(0, this.historyIndex + 1);
      this.addToHistory(newPath);
      this.currentPath = newPath;
      this.loadContent(newPath);
    }
  }

  addToHistory(path: string): void {
    this.history.push(path);
    this.historyIndex = this.history.length - 1;
  }

  updateNavigationFlags(): void {
    this.canGoBack = this.historyIndex > 0;
    this.canGoForward = this.historyIndex < this.history.length - 1;
  }

  onBack(): void {
    if (this.canGoBack) {
      this.historyIndex--;
      const newPath = this.history[this.historyIndex];
      this.currentPath = newPath;
      this.loadContent(newPath);
      this.updateNavigationFlags();
    }
  }

  onForward(): void {
    if (this.canGoForward) {
      this.historyIndex++;
      const newPath = this.history[this.historyIndex];
      this.currentPath = newPath;
      this.loadContent(newPath);
      this.updateNavigationFlags();
    }
  }

  onRefresh(): void {
    this.loadContent(this.currentPath);
  }

  onSearch(query: string): void {
    if (!query) {
      this.combineItems();
    } else {
      const lower = query.toLowerCase();
      this.virtualItems = [...this.fullDirectories, ...this.fullFiles].filter(item => {
        if (item.isFile && item.scanData) {
          const modelID = item.scanData.modelNumber || '';
          const versionID = item.scanData.versionNumber || '';
          const baseModel = item.scanData.baseModel || '';
          const name = item.name || '';
          const combined = `${modelID}_${versionID}_${baseModel}_${name}`.toLowerCase();
          return combined.includes(lower);
        } else {
          return item.name.toLowerCase().includes(lower);
        }
      });
    }
  }

  onDriveChange(drive: string): void {
    console.log('Drive changed to:', drive);
    this.selectedDrive = drive;
    this.combineItems();
  }

  onFileModalOpen(modelVersion: any): void {
    this.selectedModelVersion = modelVersion;
  }

  onModelUpdated(updatedFile: any): void {
    const index = this.virtualItems.findIndex(item => item.path === updatedFile.path);
    if (index !== -1) {
      this.virtualItems[index].scanData = updatedFile.scanData;
      // Force change detection.
      this.virtualItems = [...this.virtualItems];
      console.log('Virtual file list updated for', updatedFile.name);
    }
  }

  // Helper: returns a Promise that resolves after ms milliseconds.
  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // New method: update stats for all files sequentially with a 2-second delay between calls.
  onUpdateAllStats(): void {
    const filesToUpdate = this.virtualItems.filter(item =>
      item.isFile && item.scanData && item.scanData.versionNumber
    );
    const updateSequentially = async () => {
      for (const file of filesToUpdate) {
        this.updateStatus = `Updating ${file.name}...`;
        const versionID = file.scanData.versionNumber;
        const civitaiUrl = `https://civitai.com/api/v1/model-versions/${versionID}`;
        try {
          const data = await this.http.get<any>(civitaiUrl).toPromise();
          // Update the file's scanData.stats with the latest stats.
          file.scanData.stats = JSON.stringify(data.stats);
          console.log(`Updated stats for ${file.name} from API.`);
          // Prepare payload to update your local database.
          const modelId = file.scanData.modelNumber;
          const payload = {
            modelId,
            versionId: versionID,
            fieldsToUpdate: ['stats'],
            stats: file.scanData.stats
          };
          await this.http.post('http://localhost:3000/api/update-record-by-model-and-version', payload).toPromise();
          console.log(`Database updated for ${file.name}.`);
        } catch (err) {
          console.error(`Failed to update stats for ${file.name}:`, err);
        }
        // Wait for 2 seconds between each file update.
        await this.delay(2000);
      }
      this.updateStatus = ''; // clear status after all updates
      // Force change detection.
      this.virtualItems = [...this.virtualItems];
      console.log('All file updates completed.');
    };

    updateSequentially();
  }

  // Called when the grouping button is toggled in the toolbar.
  onGroupingToggle(): void {
    this.groupingMode = !this.groupingMode;
    // Reset sub-tab if needed
    if (this.groupingMode) {
      this.groupingSubTab = 'grouped';
    }
  }

  // Getter for files without tags
  get ungroupedFiles(): any[] {
    return this.virtualItems.filter(item =>
      item.isFile && (!item.scanData?.localTags || item.scanData.localTags.length === 0)
    );
  }

  // In VirtualComponent.ts
  get filesByGroup(): { [group: string]: any[] } {
    const map: { [group: string]: any[] } = {};
    this.virtualItems.forEach(item => {
      if (item.isFile && item.scanData?.localTags && item.scanData.localTags.length > 0) {
        // Sort the tokens to ensure consistent group keys, then join them.
        const sortedTokens = [...item.scanData.localTags].sort();
        const groupKey = `[${sortedTokens.join(', ')}]`; // e.g. "[ameku, takao]"
        if (!map[groupKey]) {
          map[groupKey] = [];
        }
        map[groupKey].push(item);
      }
    });
    return map;
  }

  get uniqueGroups(): string[] {
    return Object.keys(this.filesByGroup).sort();
  }


  // Getter for building a map of files by tag.
  get filesByTag(): { [tag: string]: any[] } {
    const map: { [tag: string]: any[] } = {};
    this.virtualItems.forEach(item => {
      if (item.isFile && item.scanData?.localTags && item.scanData.localTags.length > 0) {
        item.scanData.localTags.forEach((tag: string) => {
          if (!map[tag]) {
            map[tag] = [];
          }
          map[tag].push(item);
        });
      }
    });
    return map;
  }

  // Getter for unique tag names (for iterating in template)
  get uniqueTags(): string[] {
    return Object.keys(this.filesByTag).sort();
  }

  // Toggle the sidebar.
  toggleGroupingSidebar(): void {
    this.groupingSidebarOpen = !this.groupingSidebarOpen;
  }

  // Aggregated options grouped by property.
  // (No changes here; your existing logic remains the same.)
  get aggregatedOptions(): { [key: string]: string[] } {
    const result: { [key: string]: Set<string> } = {
      "Name": new Set<string>(),
      "scanData.name": new Set<string>(),
      "scanData.tags": new Set<string>(),
      "scanData.mainModelName": new Set<string>(),
      "scanData.triggerWords": new Set<string>()
    };

    // Populate each group.
    this.virtualItems.forEach(item => {
      if (item.name) {
        result["Name"].add(item.name);
      }
      if (item.scanData && item.scanData.name) {
        result["scanData.name"].add(item.scanData.name);
      }
      if (item.scanData && Array.isArray(item.scanData.tags)) {
        item.scanData.tags.forEach((tag: string) => result["scanData.tags"].add(tag));
      }
      if (item.scanData && item.scanData.mainModelName) {
        result["scanData.mainModelName"].add(item.scanData.mainModelName);
      }
      if (item.scanData && Array.isArray(item.scanData.triggerWords)) {
        item.scanData.triggerWords.forEach((word: string) => result["scanData.triggerWords"].add(word));
      }
    });

    // Helper: split strings by special characters (supports Unicode)
    // Updated to only return tokens with more than 1 letter.
    const splitBySpecialChars = (input: string): string[] =>
      input.split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 1);

    // Create a union set for the "All" group.
    const allSet: Set<string> = new Set<string>();
    for (const key in result) {
      for (const value of result[key].values()) {
        // Split each value into tokens, convert to lowercase and add to the "All" set.
        const tokens = splitBySpecialChars(value);
        tokens.forEach(token => allSet.add(token.toLowerCase()));
      }
    }
    // Add the "All" key with the union of tokens.
    result["All"] = allSet;

    // Convert every set to a sorted array.
    const final: { [key: string]: string[] } = {};
    for (const key in result) {
      final[key] = Array.from(result[key]).sort();
    }
    return final;
  }


  // ---- New Section: Filtering Ungrouped Files Based on Selected Tokens ----

  // Event handler to receive token updates from the sidebar.
  onTokensChanged(tokens: string[]): void {
    this.selectedTokens = tokens;
  }

  // Helper: Split a string by special characters (supports Unicode).
  private splitBySpecialChars(input: string): string[] {
    return input.split(/[^\p{L}\p{N}]+/u).filter(token => token.length > 0);
  }

  // Helper: Check if a given file matches at least one token from the selected tokens.
  fileMatchesTokens(file: any, tokens: string[]): boolean {
    if (!tokens || tokens.length === 0) return false;
    const allFileTokens = new Set<string>();

    // Aggregate tokens from file's properties.
    if (file.name) {
      this.splitBySpecialChars(file.name).forEach(token =>
        allFileTokens.add(token.toLowerCase())
      );
    }
    if (file.scanData) {
      if (file.scanData.name) {
        this.splitBySpecialChars(file.scanData.name).forEach(token =>
          allFileTokens.add(token.toLowerCase())
        );
      }
      if (Array.isArray(file.scanData.tags)) {
        file.scanData.tags.forEach((tag: string) =>
          this.splitBySpecialChars(tag).forEach(t => allFileTokens.add(t.toLowerCase()))
        );
      }
      if (file.scanData.mainModelName) {
        this.splitBySpecialChars(file.scanData.mainModelName).forEach(token =>
          allFileTokens.add(token.toLowerCase())
        );
      }
      if (Array.isArray(file.scanData.triggerWords)) {
        file.scanData.triggerWords.forEach((word: string) =>
          this.splitBySpecialChars(word).forEach(t => allFileTokens.add(t.toLowerCase()))
        );
      }
    }

    // Check if any selected token (lowercased) is found within the file tokens.
    return tokens.every(token => allFileTokens.has(token.toLowerCase()));
  }

  // Getter for ungrouped files that match at least one of the selected tokens.
  get matchedUngroupedFiles(): any[] {
    return this.ungroupedFiles.filter(file =>
      this.fileMatchesTokens(file, this.selectedTokens)
    );
  }

  // Getter for ungrouped files that do not match any of the selected tokens.
  get unmatchedUngroupedFiles(): any[] {
    return this.ungroupedFiles.filter(file =>
      !this.fileMatchesTokens(file, this.selectedTokens)
    );
  }

  clearFileSelection(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.file-card')) {
      this.globalSelectedItems = [];
    }
  }


  onFileSelectionChanged(selectedItems: any[]): void {
    this.globalSelectedItems = selectedItems;
  }

  async applyGrouping(): Promise<void> {
    if (!this.selectedTokens || this.selectedTokens.length === 0) {
      console.warn('No grouping tokens selected. Please add grouping tags.');
      return;
    }
    if (!this.globalSelectedItems || this.globalSelectedItems.length === 0) {
      console.warn('No files selected for grouping.');
      return;
    }

    // Normalize the selected tokens by sorting them.
    const normalizedTokens = [...this.selectedTokens].sort();

    for (const file of this.globalSelectedItems) {
      try {
        // Set the file's localTags to the normalized tokens.
        file.scanData.localTags = normalizedTokens;

        const modelId = file.scanData.modelNumber;
        const versionId = file.scanData.versionNumber;
        const payload = {
          modelId,
          versionId,
          fieldsToUpdate: ['localTags'],  // Make sure the API expects "localTags"
          localTags: file.scanData.localTags
        };

        await this.http.post('http://localhost:3000/api/update-record-by-model-and-version', payload).toPromise();
        console.log(`Applied grouping for ${file.name}`);
      } catch (err) {
        console.error(`Error applying grouping for ${file.name}:`, err);
      }
    }
    // Force change detection so the UI updates; for example, by reassigning virtualItems:
    this.virtualItems = [...this.virtualItems];
    // Optionally, re-run combineItems() if it recalculates filtered lists.
    this.combineItems();
  }

  async removeGroup(file: any): Promise<void> {
    try {
      // Clear the grouping (localTags) for the file.
      file.scanData.localTags = [];
      const modelId = file.scanData.modelNumber;
      const versionId = file.scanData.versionNumber;
      const payload = {
        modelId,
        versionId,
        fieldsToUpdate: ['localTags'],
        localTags: []  // Sending an empty array
      };
      await this.http.post('http://localhost:3000/api/update-record-by-model-and-version', payload).toPromise();
      console.log(`Removed grouping for ${file.name}`);
      // Refresh the local data (update virtualItems or call combineItems).
      this.virtualItems = [...this.virtualItems];
      this.combineItems();
    } catch (err) {
      console.error(`Error removing grouping for ${file.name}:`, err);
    }
  }

  // New: A helper method to generate suggestions for a given property.
  private generateSuggestions(property: string, digit: number): { combination: string[]; models: any[] }[] {
    // 1) Get the raw option strings in original order
    const rawOptions = this.aggregatedOptions[property] || [];
    // 2) Flatten them into a word list of tokens
    const wordList = rawOptions.flatMap(opt => this.splitBySpecialChars(opt));

    if (wordList.length < digit) return [];

    const suggestions: { combination: string[]; models: any[] }[] = [];

    // 3) Sliding window over the tokens
    for (let i = 0; i <= wordList.length - digit; i++) {
      const combination = wordList.slice(i, i + digit);

      // 4) Find all files where the given property contains every token
      const matchingModels = this.virtualItems.filter(file => {
        // drill down to file.scanData[property]
        const parts = property.split('.');
        let val: any = file;
        for (const p of parts) {
          val = val && val[p];
        }

        // build a lowercase token list from val (string or array)
        let fileWords: string[] = [];
        if (typeof val === 'string') {
          fileWords = this.splitBySpecialChars(val).map(w => w.toLowerCase());
        } else if (Array.isArray(val)) {
          fileWords = val
            .flatMap((v: string) => this.splitBySpecialChars(v))
            .map(w => w.toLowerCase());
        } else {
          return false; // neither string nor array → skip
        }

        // check that *all* tokens in this combination appear
        return combination.every(tok =>
          fileWords.includes(tok.toLowerCase())
        );
      });

      suggestions.push({ combination, models: matchingModels });
    }

    return suggestions;
  }

  // New: A getter to generate suggestion results for all aggregated options.
  get suggestionResults(): { [property: string]: { combination: string[], models: any[] }[] } {
    const results: { [property: string]: { combination: string[], models: any[] }[] } = {};
    // Iterate over aggregatedOptions keys (for example, "scanData.tags" etc.)
    for (const prop in this.aggregatedOptions) {
      // For each property, only generate if there are at least suggestDigit tokens.
      if (this.aggregatedOptions[prop].length >= this.suggestDigit) {
        results[prop] = this.generateSuggestions(prop, this.suggestDigit);
      }
    }
    return results;
  }

  // When the suggest digit input changes, update the property.
  onSuggestDigitChange(newVal: number): void {
    this.suggestDigit = newVal;
  }

  // Returns an array of { key, suggestions } where each suggestion has models.length>0
  get filteredSuggestions(): {
    key: string,
    suggestions: { combination: string[]; models: any[] }[]
  }[] {
    return Object.entries(this.suggestionResults)
      // suggestionResults: { [prop: string]: {combination,models}[] }
      .map(([key, arr]) => ({
        key,
        suggestions: arr.filter(s => s.models.length > 0)
      }))
      // drop any property that ended up with zero suggestions
      .filter(group => group.suggestions.length > 0);
  }

  /** holds only the combos the backend says to keep */
  backendFilteredSuggestions: {
    key: string;
    suggestions: { combination: string[]; models: any[] }[];
  }[] = [];

  /** single handler for all three tabs */
  onSelectTab(tab: 'grouped' | 'ungrouped' | 'suggest'): void {
    this.groupingSubTab = tab;

    if (tab === 'suggest') {
      this.backendFilteredSuggestions = [];
      this.loadBackendFilteredSuggestions();
    }
  }

  /** choose between local vs. backend-filtered suggestions */
  get suggestionsToShow() {
    return this.groupingSubTab === 'suggest'
      ? this.backendFilteredSuggestions
      : this.filteredSuggestions;
  }

  /** call your service with the locally-generated combos */
  /** call your service with the locally-generated combos */
  private loadBackendFilteredSuggestions(): void {
    // keep track of which sub-tab is active now
    const prevKey = this.suggestionSubTab;

    // flatten all local combinations
    const combos = this.filteredSuggestions
      .reduce((all, grp) => all.concat(grp.suggestions.map(s => s.combination)), [] as string[][]);

    if (combos.length === 0) {
      this.backendFilteredSuggestions = [];
      this.suggestionSubTab = '';
      return;
    }

    this.virtualService.compareCombinations(combos).subscribe(matchedCombos => {
      // rebuild the groups
      this.backendFilteredSuggestions = this.filteredSuggestions
        .map(group => ({
          key: group.key,
          suggestions: group.suggestions.filter(s =>
            matchedCombos.some(mc =>
              mc.length === s.combination.length &&
              mc.every((tok, i) => tok === s.combination[i])
            )
          )
        }))
        .filter(g => g.suggestions.length > 0);

      // get the new list of keys
      const keys = this.backendFilteredSuggestions.map(g => g.key);

      // if the previous tab is still there, stick with it
      if (prevKey && keys.includes(prevKey)) {
        this.suggestionSubTab = prevKey;
      }
      // otherwise, default to the first, or clear if none
      else if (keys.length) {
        this.suggestionSubTab = keys[0];
      } else {
        this.suggestionSubTab = '';
      }
    });
  }



  get suggestionTabKeys(): string[] {       // for *ngFor tabs
    return this.suggestionsToShow.map(g => g.key);
  }

  get activeGroupSuggestions() {            // for *ngFor content
    const grp = this.suggestionsToShow.find(g => g.key === this.suggestionSubTab);
    return grp ? grp.suggestions : [];
  }


  /** When the “×” next to a token is clicked */
  onRemoveToken(tag: string): void {
    this.virtualService
      .addPendingRemoveTag(tag)
      .subscribe({
        next: () => {
          // once the server has added it, re-load the suggestions
          this.loadBackendFilteredSuggestions();
        },
        error: err => {
          console.error('Failed to add pending-remove tag', err);
        }
      });
  }


}
