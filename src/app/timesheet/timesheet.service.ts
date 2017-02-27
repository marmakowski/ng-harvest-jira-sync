import {Injectable} from "@angular/core";
import {Stream} from "ts-stream";
import {HarvestService} from "./harvest.service";
import {AlertService} from "../alert/alert.service";
import {HarvestEntry} from "./model/harvest-entry";
import {TimesheetEntry} from "./model/timesheet-entry";
import {JiraService} from "./jira.service";
import {JiraWorklog} from "./model/jira-worklog";


@Injectable()
export class TimesheetService {

  public timesheetEntries: TimesheetEntry[] = [];

  constructor(private harvestService : HarvestService,
              private jiraService : JiraService,
              private alertService : AlertService) { }

  public loadTodaysHarvestEntries() {
    this.harvestService.loadTodaysHarvestEntries()
      .subscribe(
       response => Stream.from(response.json().day_entries)
          .map(json => new HarvestEntry(json))
          .toArray()
          .then(this.processHarvestEntries),
        error => this.alertService.error("Cannot get Harvest Timesheet - are you logged in?", error),
      );
  }

  public syncToJira(timesheetEntry : TimesheetEntry) {
    timesheetEntry.syncing = true;
    this.jiraService.syncToJira(timesheetEntry)
      .finally(() => timesheetEntry.syncing = false)
      .subscribe(
        response => {
          timesheetEntry.jiraWorklog = response.json() as JiraWorklog;
          this.alertService.success("Created JIRA worklog for " + timesheetEntry.harvestEntry.getJiraTicket());
        },
        error => this.alertService.error("Cannot save to Jira - does the ticket nr exist? are you logged in?", error)
      );
  }

  private processHarvestEntries = (harvestEntries:HarvestEntry[]) => {
    if(!harvestEntries || harvestEntries.length == 0){
      this.alertService.info("No entries found in Harvest today");
    } else {
      console.log(harvestEntries.length + " entries found in Harvest today");
      this.alertService.clear();
    }

    Stream.from(harvestEntries)
      .map(harvestEntry => new TimesheetEntry(harvestEntry))
      .toArray()
      .then(timesheetEntries => this.timesheetEntries = timesheetEntries);
  }

}