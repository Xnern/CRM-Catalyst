<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Email</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h1 style="color: #333; margin-bottom: 20px;">Test des paramètres email</h1>
        
        <p style="color: #666; line-height: 1.6;">
            Félicitations ! Vos paramètres email sont correctement configurés.
        </p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #555; margin-top: 0;">Paramètres actuels :</h3>
            <ul style="color: #666; line-height: 1.8;">
                <li><strong>Serveur SMTP:</strong> {{ $settings['smtp_host'] ?? 'Non configuré' }}</li>
                <li><strong>Port:</strong> {{ $settings['smtp_port'] ?? 'Non configuré' }}</li>
                <li><strong>Chiffrement:</strong> {{ $settings['smtp_encryption'] ?? 'Non configuré' }}</li>
                <li><strong>Expéditeur:</strong> {{ $settings['email_from_name'] ?? 'Non configuré' }} &lt;{{ $settings['email_from_address'] ?? 'Non configuré' }}&gt;</li>
            </ul>
        </div>
        
        <p style="color: #666; line-height: 1.6;">
            Cet email confirme que votre configuration SMTP fonctionne correctement avec les paramètres définis dans votre CRM.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
            Envoyé depuis votre CRM Catalyst
        </p>
    </div>
</body>
</html>