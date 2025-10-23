package com.email.writer.app;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public class LombokTest {
    private final String name;
    private final int age;

    public static void main(String[] args) {
        LombokTest test = new LombokTest("Alice", 30);
        System.out.println("Name: " + test.getName());
        System.out.println("Age: " + test.getAge());
    }
}
