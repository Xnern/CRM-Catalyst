export interface Activity {
    type: 'contact' | 'company' | 'document' | 'activity';
    title: string;
    date: string;
    id: number;
    subject_id?: number;
    subject_type?: string;
    properties?: Record<string, any>;
  }
