/**
 * Event types with their properties
 */
export interface EventType {
    label: string;
    color: string;
}

export interface EventTypes {
    [key: string]: EventType;
}

/**
 * Priority levels with their properties  
 */
export interface PriorityLevel {
    label: string;
    color: string;
}

export interface PriorityLevels {
    [key: string]: PriorityLevel;
}

/**
 * CRM relationship interfaces
 */
export interface EventContact {
    id: number;
    name: string;
    email: string;
}

export interface EventCompany {
    id: number;
    name: string;
}

export interface EventOpportunity {
    id: number;
    name: string;
    stage: string;
}

export interface EventReminder {
    id: number;
    title: string;
}

/**
 * Recurrence configuration for recurring events
 */
export interface RecurrenceConfig {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    until?: string;
    count?: number;
    byWeekDay?: number[];
    byMonthDay?: number[];
}

/**
 * Enhanced interface for local calendar events with CRM integration
 */
export interface LocalCalendarEvent {
    id: number;
    title: string;
    description: string | null;
    start_datetime: string;
    end_datetime: string;
    type: string;
    type_label: string;
    priority: string;
    priority_label: string;
    color: string;
    all_day: boolean;
    location: string | null;
    attendees: string[] | null;
    notes: string | null;
    meeting_link: string | null;
    is_recurring: boolean;
    recurrence_config: RecurrenceConfig | null;
    // CRM relationships
    contact: EventContact | null;
    company: EventCompany | null;
    opportunity: EventOpportunity | null;
    reminder: EventReminder | null;
    // Metadata
    created_at?: string;
    updated_at?: string;
}

/**
 * Interface for creating/updating local events
 */
export interface LocalEventPayload {
    title: string;
    description?: string | null;
    start_datetime: string;
    end_datetime: string;
    type?: string;
    priority?: string;
    color?: string;
    all_day?: boolean;
    location?: string;
    attendees?: string[];
    notes?: string;
    meeting_link?: string;
    contact_id?: number;
    company_id?: number;
    opportunity_id?: number;
    reminder_id?: number;
    is_recurring?: boolean;
    recurrence_config?: RecurrenceConfig;
}

/**
 * Interface for updating local events (includes event ID)
 */
export interface UpdateLocalEventPayload extends LocalEventPayload {
    eventId: number;
}
