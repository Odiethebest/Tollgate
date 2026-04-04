FROM maven:3.9.11-eclipse-temurin-17 AS build

WORKDIR /workspace

COPY pom.xml .
COPY src ./src

RUN mvn -DskipTests clean package

FROM eclipse-temurin:17-jre

WORKDIR /app

COPY --from=build /workspace/target/llm-api-gateway-0.0.1-SNAPSHOT.jar /app/app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
