FROM eclipse-temurin:21-jdk AS build

WORKDIR /app
COPY . .

RUN sh mvnw -B -ntp package

FROM eclipse-temurin:21-jre

WORKDIR /app
COPY --from=build /app/target/adocao-*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]