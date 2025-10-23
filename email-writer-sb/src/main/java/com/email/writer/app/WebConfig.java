package com.email.writer.app;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
@Configuration
public class WebConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                // Use your specific frontend URL to be secure, or "*" for all
                registry.addMapping("/api/**")
                        .allowedOrigins("http://localhost:5174")
                        .allowedMethods("*") // Allows all methods (POST, OPTIONS, etc.)
                        .allowedHeaders("*");
            }
        };
    }
}