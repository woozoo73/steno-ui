package com.woozooha.adonistrack.test.spring;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);

        System.out.println("http://localhost:8080/webjars/steno-ui/html/stories.html");
    }

}
