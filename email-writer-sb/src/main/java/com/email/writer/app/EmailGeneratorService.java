package com.email.writer.app;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.List;

// NOTE: This service assumes an 'EmailRequest' record/class exists in this package
// with methods getEmailContent() and getTone().

@Service
public class EmailGeneratorService {

    private final WebClient webClient;
    private final String geminiApiKey;

    // Use a constant for the recommended model path
    private static final String GEMINI_MODEL_PATH = "/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

    // Inject the key via constructor for better immutability/testability
    public EmailGeneratorService(
            WebClient.Builder webClientBuilder,
            @Value("${gemini.api.key}") String geminiApiKey,
            @Value("${gemini.api.url}") String geminiApiUrl) { // Include URL for constructor consistency

        this.geminiApiKey = geminiApiKey;
        // Configure the base URL for the WebClient instance
        this.webClient = webClientBuilder
                .baseUrl(geminiApiUrl)
                .build();
    }

    /**
     * Generates an email reply using the Gemini API.
     * NOTE: Using .block() keeps the original synchronous method signature, but it's important
     * to know this blocks the thread. In a WebFlux context, returning Mono<String> is preferred.
     *
     * @param emailRequest The request containing the original email content and desired tone.
     * @return The generated email content or an error message.
     */
    public String generateEmailReply(EmailRequest emailRequest) {
        if (emailRequest == null || emailRequest.getEmailContent() == null || emailRequest.getEmailContent().isEmpty()) {
            return "Invalid request: email content is required.";
        }

        try {
            // 1. Build the prompt
            String prompt = buildPrompt(emailRequest);

            // 2. Construct the request body using records for type safety
            GeminiRequest requestBody = new GeminiRequest(
                    List.of(new Content(List.of(new Part(prompt))))
            );

            // 3. Perform the API call using strongly typed objects
            GeminiResponse response = webClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path(GEMINI_MODEL_PATH)
                            .queryParam("key", geminiApiKey)
                            .build())
                    .header("Content-Type", "application/json")
                    .bodyValue(requestBody)
                    // Retrieve the strongly typed response object directly
                    .retrieve()
                    .bodyToMono(GeminiResponse.class)
                    .block();

            // 4. Extract and return the content
            return extractResponseContent(response);

        } catch (WebClientResponseException e) {
            System.err.println("Gemini API HTTP Error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString());
            return "Gemini API error (" + e.getStatusCode() + "): Could not generate email.";
        } catch (Exception e) {
            System.err.println("Unexpected error during email generation: " + e.getMessage());
            return "Unexpected error: Could not generate email.";
        }
    }

    /**
     * Extracts the generated text from the typed GeminiResponse object.
     */
    private String extractResponseContent(GeminiResponse response) {
        if (response == null || response.candidates() == null || response.candidates().isEmpty()) {
            return "No content returned from Gemini API.";
        }

        // Safely navigate the typed response structure
        Candidate candidate = response.candidates().get(0);
        if (candidate.content() != null && candidate.content().parts() != null && !candidate.content().parts().isEmpty()) {
            return candidate.content().parts().get(0).text();
        }

        return "Response content structure was empty or invalid.";
    }

    /**
     * Builds the prompt for the Gemini model, including specific instructions for tone.
     */
    private String buildPrompt(EmailRequest emailRequest) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are an expert email writer. Generate a professional email reply to the following message. ")
                .append("Only provide the email body content. Do not include a subject line, a formal salutation (e.g., 'Dear John'), or a signature block (e.g., 'Best regards,'). ");

        if (emailRequest.getTone() != null && !emailRequest.getTone().isEmpty()) {
            prompt.append("The desired tone for the response is: ").append(emailRequest.getTone().toLowerCase()).append(". ");
        }

        prompt.append("\n\nOriginal email to reply to:\n")
                .append(emailRequest.getEmailContent());

        return prompt.toString();
    }

    // --- Internal Request/Response Records for Type Safety (Modern Java) ---

    // Request Records
    private record Part(String text) {}
    private record Content(List<Part> parts) {}
    private record GeminiRequest(List<Content> contents) {}

    // Response Records (Simplified mapping of the required response fields)
    private record ResponsePart(String text) {}
    private record ResponseContent(List<ResponsePart> parts) {}
    private record Candidate(ResponseContent content) {}
    private record GeminiResponse(List<Candidate> candidates) {}
}
