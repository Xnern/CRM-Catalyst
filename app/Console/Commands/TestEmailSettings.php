<?php

namespace App\Console\Commands;

use App\Mail\TestSettingsMail;
use App\Services\SettingsService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class TestEmailSettings extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'email:test {recipient? : The email address to send the test to}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test email settings by sending a test email';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $settings = SettingsService::getInstance();
        
        // Get email settings
        $emailSettings = $settings->getEmailSettings();
        
        // Get recipient email
        $recipient = $this->argument('recipient') ?? $this->ask('Enter recipient email address');
        
        if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            $this->error('Invalid email address');
            return 1;
        }
        
        $this->info('Sending test email to: ' . $recipient);
        $this->info('Using SMTP: ' . ($emailSettings['smtp_host'] ?? 'Not configured'));
        
        try {
            Mail::to($recipient)->send(new TestSettingsMail($emailSettings));
            
            $this->info('✅ Test email sent successfully!');
            $this->info('Check your inbox at: ' . $recipient);
            
            if (str_contains($emailSettings['smtp_host'] ?? '', 'mailtrap')) {
                $this->info('💡 Using Mailtrap? Check your Mailtrap inbox at https://mailtrap.io');
            }
            
            return 0;
        } catch (\Exception $e) {
            $this->error('❌ Failed to send email: ' . $e->getMessage());
            $this->info('Please check your email settings in the CRM settings page.');
            return 1;
        }
    }
}