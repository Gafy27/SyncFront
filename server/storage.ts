import { type Device, type Gateway, type Event, type Application, type AiModel } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getDevices(): Promise<Device[]>;
  getGateways(): Promise<Gateway[]>;
  getEvents(): Promise<Event[]>;
  getApplications(): Promise<Application[]>;
  getAiModels(): Promise<AiModel[]>;
}

export class MemStorage implements IStorage {
  private devices: Map<string, Device>;
  private gateways: Map<string, Gateway>;
  private events: Map<string, Event>;
  private applications: Map<string, Application>;
  private aiModels: Map<string, AiModel>;

  constructor() {
    this.devices = new Map();
    this.gateways = new Map();
    this.events = new Map();
    this.applications = new Map();
    this.aiModels = new Map();
  }

  async getDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async getGateways(): Promise<Gateway[]> {
    return Array.from(this.gateways.values());
  }

  async getEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async getApplications(): Promise<Application[]> {
    return Array.from(this.applications.values());
  }

  async getAiModels(): Promise<AiModel[]> {
    return Array.from(this.aiModels.values());
  }
}

export const storage = new MemStorage();
