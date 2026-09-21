# Data Backups Specification

## Purpose

Protects application data against accidental loss and table deletion by keeping automatic, retained backups stored independently of the source tables.

## Requirements

### Requirement: Automatic Daily Backup

The system SHALL back up all application data automatically once per day, without manual action.

#### Scenario: Daily backup runs unattended

- **WHEN** a day passes
- **THEN** a new backup of all application data SHALL exist
- **AND** no manual action SHALL have been required to create it

### Requirement: Backup Retention Period

The system SHALL retain each backup for 30 days.

#### Scenario: Backup available within retention window

- **WHEN** a backup is 30 days old or younger
- **THEN** the backup SHALL be available for restoration

#### Scenario: Backup expires after retention window

- **WHEN** a backup is older than 30 days
- **THEN** the system SHALL remove it automatically

### Requirement: Backup Coverage of All Application Data

The system SHALL include all application data tables in the automatic backup, including any table added after this capability is introduced.

#### Scenario: New data table is added

- **GIVEN** a new application data table is created
- **WHEN** the next automatic backup runs
- **THEN** the new table SHALL be included without additional configuration

### Requirement: Backup Restoration

The system SHALL allow restoring application data from any backup within its retention period.

#### Scenario: Restore from a recent backup

- **GIVEN** a backup exists within its 30-day retention period
- **WHEN** a restoration is requested from that backup
- **THEN** the system SHALL restore the data as captured at backup time
